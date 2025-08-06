const http = require('http');
const fs = require('fs').promises; // Import the promise-based fs module
const path = require('path');

async function display(req, res, config){
    try{
        const imagesDirectory = path.join(__dirname, '../images');
        const imageName = path.basename(req.url); // Extract filename from URL
        const imagePath = path.join(imagesDirectory, imageName);

        console.log(`Attempting to serve image: ${imagePath}`);

        // Await the file read operation. Errors from readFile will now be caught by the outer try...catch.
        const data = await fs.readFile(imagePath);

        const ext = path.extname(imageName).toLowerCase();
        let contentType = 'application/octet-stream'; // Default

        // Determine content type based on file extension
        if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
        } else if (ext === '.png') {
            contentType = 'image/png';
        } else if (ext === '.gif') {
            contentType = 'image/gif';
        } else if (ext === '.svg') {
            contentType = 'image/svg+xml';
        } else if (ext === '.webp') {
            contentType = 'image/webp';
        }
        // Add more image types as needed

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);

    }catch(error){
        console.error('Images: Error fetching or processing data:', error);
        // Important: Check if headers have already been sent before attempting to write new ones.
        // This prevents the "Cannot write headers after they are sent" error if an error
        // occurred *after* headers were already sent (though less likely with await fs.readFile).
        if (!res.headersSent) {
            // For file not found or other read errors
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Image not found');
            } else {
                // For other server errors
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`<h1>Error</h1><p>Could not fetch data. Please check the server and network.</p><p>${error.message}</p>`);
            }
        } else {
            // If headers were already sent, we can't send a new error response.
            // Just log the error, and the connection might eventually close.
            console.error('Headers already sent, cannot send error response. Original error:', error);
        }
    }
}

module.exports={
    display
}