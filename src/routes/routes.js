const express = require('express')
const router = express.Router();
const multer = require('multer')
const path = require('path')
const fs = require('fs')
let uniqueSuffix = ''
let XLSX = require("xlsx");
const { default: mongoose } = require('mongoose');

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
    let workbook = XLSX.readFile(`${uploadFolder}/${fileName}`);
    let allHeaders = [];
    let mappedrows = []
    
    // Get the first sheet name
    const sheetName = workbook.SheetNames[0];
    
    // Get the sheet data
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert the sheet data to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    
    // Print each row
    rows.forEach((row, index) => {
      if(row.length != 0){
        if (index === 0) {
          // The first row contains the headers
          allHeaders = row;
        } else {
          // Create an object for each row
          let mappedRow = {};
          for (let i = 0; i < allHeaders.length; i++) {
            mappedRow[allHeaders[i]] = row[i];
          }
          // Push the mapped row into the array
          mappedrows.push(mappedRow);
        }
      }
    });

    // Define a schema with no strict validation
    const dynamicSchema = new mongoose.Schema({}, { strict: false });

    // Create the model using `mongoose.model`
    const dynamicModel = mongoose.model(fileName, dynamicSchema);

    // console.log(mappedrows, "dynamicSchemadynamicSchema")

    // Use `insertMany` directly on the model
    let insertedRecords = await dynamicModel.insertMany(mappedrows);

    // console.log(insertedRecords, "llHeaders");

    res.send({ status: true, message: fileName, rows:insertedRecords});
  } catch (error) {
    res.send({ status: false, message: error.message });
  }
});



module.exports = router



