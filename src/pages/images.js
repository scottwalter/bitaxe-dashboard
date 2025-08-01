const http = require('http');
const fs = require('fs');
const path = require('path');

async function display(req, res){
    try{
        const imagesDirectory = path.join(__dirname, '../images');
        const imageName = path.basename(req.url); // Extract filename from URL
        const imagePath = path.join(imagesDirectory, imageName);

        fs.readFile(imagePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Image not found');
                return;
            }

            const ext = path.extname(imageName).toLowerCase();
            let contentType = 'application/octet-stream'; // Default
            if (ext === '.jpg' || ext === '.jpeg') {
                contentType = 'image/jpeg';
            } else if (ext === '.png') {
                contentType = 'image/png';
            } else if (ext === '.gif') {
                contentType = 'image/gif';
            }
            // Add more image types as needed

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    }catch(error){
        console.error('Images: Error fetching or processing data:', error);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><p>Could not fetch data. Please check the server and network.</p><p>${error.message}</p>`);
    };
}
module.exports={
    display
}