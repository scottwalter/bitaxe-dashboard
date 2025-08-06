const http = require('http');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function display(req, res, config){
    try {
      const imagePath = path.join(__dirname, '../images/favicon.ico');
      fs.readFile(imagePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Image not found');
                return;
            }

            res.writeHead(200, { 'Content-Type': 'image/x-icon' }); // Adjust MIME type as needed
            res.end(data); // Send the image data as a buffer
        });
      
    }catch (error){ 
      console.error('Favicon: Error fetching or processing data:', error);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error</h1><p>Could not fetch data. Please check the server and network.</p><p>${error.message}</p>`);
    };
    return "1";

}

module.exports={
    display
};