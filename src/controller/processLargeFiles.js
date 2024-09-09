const XLSX = require('xlsx-stream-reader');
const fs = require('fs');
const path = require('path');
const uploadFolder = path.join(__dirname, '../../upload');
const mongoose = require('mongoose');

// const processLargeExcelFile = async (req, res, uniqueSuffix) => {
//   try {
//     let fileName = uniqueSuffix;
//     const filePath = path.join(uploadFolder, fileName);

//     console.log('Reading file from:', filePath);

//     // Define schema and create model (schema is dynamic)
//     const dynamicSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
//     const dynamicModel = mongoose.model(fileName, dynamicSchema);

//     let totalInserted = 0;
//     let bulkData = [];  // Array to accumulate bulk records
//     const SIZE_LIMIT_MB = 15;  // Maximum size limit in MB
//     const SIZE_LIMIT_BYTES = SIZE_LIMIT_MB * 1024 * 1024;  // Convert MB to bytes

//     // Helper function to estimate size of bulkData
//     const getEstimatedSize = (data) => {
//       return Buffer.byteLength(JSON.stringify(data), 'utf8');
//     };

//     // Create a stream for reading the Excel file
//     const workBookReader = new XLSX();
//     const stream = fs.createReadStream(filePath);
//     stream.pipe(workBookReader);

//     // Set up event handlers for the workbook stream
//     workBookReader.on('worksheet', function (workSheetReader) {
//       if (workSheetReader.id > 1) {
//         workSheetReader.skip();
//         return;
//       }

//       workSheetReader.on('row', async function (row) {
//         if (row.attributes.r == 1) {
//           // Skip the header row
//           return;
//         }

//         // Convert row to an object (assuming row.values is an array)
//         let rowData = {};
//         row.values.forEach((value, index) => {
//           rowData[`col_${index}`] = value;
//         });

//         // Add the row data to the bulkData array
//         bulkData.push(rowData);

//         // Check if accumulated data exceeds SIZE_LIMIT_BYTES
//         if (getEstimatedSize(bulkData) >= SIZE_LIMIT_BYTES) {
//           try {
//             await dynamicModel.insertMany(bulkData);
//             totalInserted += bulkData.length;
//             console.log(`Inserted ${totalInserted} records`);
//             bulkData = [];  // Reset bulkData after insertion
//           } catch (err) {
//             console.error('Error inserting rows:', err.message);
//           }
//         }
//       });

//       workSheetReader.on('end', async function () {
//         // Insert any remaining records in bulkData
//         if (bulkData.length > 0) {
//           try {
//             await dynamicModel.insertMany(bulkData);
//             totalInserted += bulkData.length;
//             console.log(`Inserted remaining ${bulkData.length} records`);
//           } catch (err) {
//             console.error('Error inserting remaining rows:', err.message);
//           }
//         }

//         console.log(`Finished processing sheet. Total records inserted: ${totalInserted}`);
//       });

//       workSheetReader.process();
//     });

//     workBookReader.on('end', function () {
//       console.log(`Finished processing file. Total records inserted: ${totalInserted}`);
//       res.send({ status: true, message: `Successfully inserted ${totalInserted} records.` });
//     });

//     workBookReader.on('error', function (error) {
//       console.error('Error:', error.message);
//       res.status(500).send({ status: false, message: error.message });
//     });
//   } catch (error) {
//     console.error('Error:', error.message);
//     res.status(500).send({ status: false, message: error.message });
//   }
// };

const processLargeExcelFile = async (req, res, uniqueSuffix) => {
  try {
    let fileName = uniqueSuffix;
    const filePath = path.join(uploadFolder, fileName);

    console.log('Reading file from:', filePath);

    // Define schema and create model (schema is dynamic)
    const dynamicSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
    const dynamicModel = mongoose.model(fileName, dynamicSchema);

    let totalInserted = 0;
    let rowCount = 0;  // Track total number of rows processed
    let bulkData = [];  // Array to accumulate bulk records
    const SIZE_LIMIT_MB = 1;  // Maximum size limit in MB
    const SIZE_LIMIT_BYTES = SIZE_LIMIT_MB * 1024 * 1024;  // Convert MB to bytes

    // Helper function to estimate size of bulkData
    const getEstimatedSize = (data) => {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    };

    // Create a stream for reading the Excel file
    const workBookReader = new XLSX();
    const stream = fs.createReadStream(filePath);
    stream.pipe(workBookReader);

    // Set up event handlers for the workbook stream
    workBookReader.on('worksheet', function (workSheetReader) {
      if (workSheetReader.id > 1) {
        workSheetReader.skip();
        return;
      }

      workSheetReader.on('row', async function (row) {
        if (row.attributes.r == 1) {
          // Skip the header row
          return;
        }

        // Convert row to an object (assuming row.values is an array)
        let rowData = {};
        row.values.forEach((value, index) => {
          rowData[`col_${index}`] = value;
        });

        // Add the row data to the bulkData array
        bulkData.push(rowData);
        rowCount++;

        // Log progress every 1000 rows
        if (rowCount % 1000 === 0) {
          console.log(`Processed ${rowCount} rows`);
        }

        // Check if accumulated data exceeds SIZE_LIMIT_BYTES
        if (getEstimatedSize(bulkData) >= SIZE_LIMIT_BYTES) {
          try {
            await dynamicModel.insertMany(bulkData);
            totalInserted += bulkData.length;
            console.log(`Inserted ${totalInserted} records`);
            bulkData = [];  // Reset bulkData after insertion
          } catch (err) {
            console.error('Error inserting rows:', err.message);
          }
        }
      });

      workSheetReader.on('end', async function () {
        // Insert any remaining records in bulkData
        if (bulkData.length > 0) {
          try {
            await dynamicModel.insertMany(bulkData);
            totalInserted += bulkData.length;
            console.log(`Inserted remaining ${bulkData.length} records`);
          } catch (err) {
            console.error('Error inserting remaining rows:', err.message);
          }
        }

        console.log(`Finished processing sheet. Total records inserted: ${totalInserted}`);
      });

      workSheetReader.process();
    });

    workBookReader.on('end', function () {
      console.log(`Finished processing file. Total records inserted: ${totalInserted}`);
      res.send({ status: true, message: `Successfully inserted ${totalInserted} records.` });
    });

    workBookReader.on('error', function (error) {
      console.error('Error:', error.message);
      res.status(500).send({ status: false, message: error.message });
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send({ status: false, message: error.message });
  }
};



module.exports = { processLargeExcelFile };
