const express = require('express');
const app = express();
const port = 3000;

const router = require('./src/routes/routes');
const mongoose = require('mongoose');

async function startServer() {
  // try {
  //   await mongoose.connect('mongodb://127.0.0.1:27017/file_reader');
  //   console.log('Successfully connected to the MongoDB database.');
  // } catch (error) {
  //   console.error('Error connecting to MongoDB:', error.message);
  //   handleError(error); // Assuming handleError is a function you've defined elsewhere
  //   return; // Exit if the connection fails
  // }

  app.use('/', router);

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}

// Call the async function to start the server
startServer();
