const express = require('express')
const router = express.Router();
const multer = require('multer')
const path = require('path')
const fs = require('fs')
let uniqueSuffix = ''
let XLSX = require("xlsx");
const { default: mongoose } = require('mongoose');
const { timeStamp } = require('console');
const {processLargeExcelFile} = require('../controller/processLargeFiles')

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

const MAX_BATCH_SIZE = 10 * 1024 * 1024; // 10MB in bytes


router.post('/readfiles', upload.single('file'), async (req, res) => {
  try {
    let fileName = uniqueSuffix; // Assuming uniqueSuffix is defined elsewhere
    const filePath = path.join(uploadFolder, fileName);

    console.log('Reading file from:', filePath);

    // Read the workbook
    let workbook = XLSX.readFile(filePath);

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    let allHeaders = [];
    let mappedRows = [];

    // Map rows to objects with headers
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

    console.log('Total mapped rows:', mappedRows.length);

    const totalRows = mappedRows.length;
    let processedRows = 0;

    // Define schema and create model
    const dynamicSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
    const dynamicModel = mongoose.model(fileName, dynamicSchema);

    // Insert data in batches based on size
    let batch = [];
    let currentBatchSize = 0;
    let totalInserted = 0;

    for (let i = 0; i < mappedRows.length; i++) {
      const row = mappedRows[i];
      const rowSize = Buffer.byteLength(JSON.stringify(row), 'utf8');

      // If adding this row exceeds the max batch size, insert the current batch
      if (currentBatchSize + rowSize > MAX_BATCH_SIZE) {
        // Insert the current batch
        await dynamicModel.insertMany(batch);
        totalInserted += batch.length;
        console.log(`Inserted batch of ${batch.length} records, total size: ${currentBatchSize} bytes`);

        // Reset the batch
        batch = [];
        currentBatchSize = 0;
      }

      // Add the row to the current batch
      batch.push(row);
      currentBatchSize += rowSize;
      processedRows++;

      // Calculate progress
      const progress = Math.round((processedRows / totalRows) * 100);
      console.log(`Progress: ${progress}%`);

      // Update progress to the client
      res.write(`Processing: ${progress}%\n`); // Send string, not object
    }

    // Insert any remaining records in the last batch
    if (batch.length > 0) {
      await dynamicModel.insertMany(batch);
      totalInserted += batch.length;
      console.log(`Inserted final batch of ${batch.length} records, total size: ${currentBatchSize} bytes`);
    }

    res.write(`Processing: 100%\n`); // Final progress update
    res.end(JSON.stringify({ status: true, message: `Successfully processed ${totalInserted} records.` }));
  } catch (error) {
    console.error('Error:', error.message);
    res.write(JSON.stringify({ status: false, message: error.message }));
    res.end(); // Ensure the response ends after an error
  }
});


router.post('/readLargeXLS', upload.single('file'), (req, res) => {
  const fileName = uniqueSuffix; // Assuming this is generated earlier in your code
  processLargeExcelFile(req, res, fileName);
});

module.exports = router



