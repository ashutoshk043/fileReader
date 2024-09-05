const express = require('express')
const router = express.Router();
const multer = require('multer')
const path = require('path')
const fs = require('fs')
let uniqueSuffix = ''
let XLSX = require("xlsx");
const { default: mongoose } = require('mongoose');
const { timeStamp } = require('console');

const uploadFolder = path.join(__dirname, '../../upload')

// Ensure the upload folder exists
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder)
  },
  filename: function (req, file, cb) {
    uniqueSuffix = file.originalname + Date.now() + '.' + file.originalname.split('.').pop()
    cb(null, uniqueSuffix)
  }
})

const upload = multer({ storage: storage })

router.get('/', async(req, res)=>{
    console.log("Connected with home....")
    res.send({status:true, message:"Connected to home"})
})

router.post('/readfiles', upload.single('file'), async (req, res) => {
  try {
    let fileName = uniqueSuffix; // Assuming uniqueSuffix is defined elsewhere
    const filePath = path.join(uploadFolder, fileName);

    console.log('Reading file from:', filePath);

    // Read the workbook
    let workbook = XLSX.readFile(filePath);

    // Get sheet names and log them
    const sheetNames = workbook.SheetNames;
    console.log('Sheet Names:', sheetNames);

    if (sheetNames.length === 0) {
      throw new Error('No sheets found in the workbook.');
    }

    // Access the first sheet
    const sheetName = sheetNames[0];
    console.log('Sheet Name:', sheetName);

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Sheet ${sheetName} not found in the workbook.`);
    }

    // Convert the sheet data to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('Rows:', rows.length);

    // Process rows
    let allHeaders = [];
    let mappedRows = [];
    rows.forEach((row, index) => {
      if (row.length !== 0) {
        if (index === 0) {
          allHeaders = row;
        } else {
          let mappedRow = {};
          for (let i = 0; i < allHeaders.length; i++) {
            mappedRow[allHeaders[i]] = row[i];
          }
          mappedRows.push(mappedRow);
        }
      }
    });

    console.log('Mapped rows total:', mappedRows.length);
    // Define schema, create model, and insert data
    const dynamicSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
    const dynamicModel = mongoose.model(fileName, dynamicSchema);

    const chunkSize = 999;
    let batch = [];
    let totalInserted = 0;

    for (let i = 0; i < mappedRows.length; i++) {
      batch.push(mappedRows[i]);

      if (batch.length === chunkSize || i === mappedRows.length - 1) {
        console.log(`Inserting batch of size: ${batch.length}`);
        try {
          await dynamicModel.insertMany(batch);
          totalInserted += batch.length;
          console.log(`Successfully inserted ${batch.length} records.`);
          batch = []; // Clear batch
        } catch (error) {
          console.error('Error inserting batch:', error.message);
        }
      }
    }

    res.send({ status: true, message: `Successfully processed ${totalInserted} records.` });
  } catch (error) {
    console.error('Error:', error.message);
    res.send({ status: false, message: error.message });
  }
});



module.exports = router



