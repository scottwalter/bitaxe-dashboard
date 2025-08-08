/**
 * @file This module acts as a simple static file server for images.
 * It handles requests for image assets by reading them from the filesystem
 * and serving them with the correct MIME type.
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

/**
 * Handles requests for image files. It extracts the requested image name from the URL,
 * reads the file from the `../images` directory, determines the correct Content-Type
 * header, and sends the image data in the response.
 *
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object (not used in this handler).
 */
async function display(req, res, config) {
    try {
        // Define the base directory where images are stored.
        const imagesDirectory = path.join(__dirname, '../images');
        // Securely extract the filename from the request URL to prevent directory traversal.
        const imageName = path.basename(req.url);
        const imagePath = path.join(imagesDirectory, imageName);

        console.log(`Attempting to serve image: ${imagePath}`);

        // Asynchronously read the image file from the disk.
        const data = await fs.readFile(imagePath);

        // Determine the correct MIME type based on the file extension.
        const ext = path.extname(imageName).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.webp': 'image/webp',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream'; // Default to a generic binary stream.

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);

    } catch (error) {
        console.error('Images: Error fetching or processing data:', error);
        // Check if headers have been sent to prevent crashing the server by trying to send them again.
        if (!res.headersSent) {
            // If the file doesn't exist, send a 404 Not Found error.
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Image not found');
            } else {
                // For any other type of error, send a 500 Internal Server Error.
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

module.exports = {
    display
};