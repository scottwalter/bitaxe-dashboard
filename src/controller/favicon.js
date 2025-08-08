/**
 * @file This module handles serving the website's favicon.
 * It reads the favicon.ico file from the filesystem and sends it as a response.
 */

const fs = require('fs').promises; // Use promise-based fs for async/await
const path = require('path');

/**
 * Handles the request for the favicon.ico file.
 *
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object (not used in this handler).
 */
async function display(req, res, config) {
    try {
        // Construct the full path to the favicon file.
        const imagePath = path.join(__dirname, '../images/favicon.ico');

        // Asynchronously read the favicon file from the disk.
        const data = await fs.readFile(imagePath);

        // Send the image data with the correct MIME type.
        res.writeHead(200, { 'Content-Type': 'image/x-icon' });
        res.end(data);

    } catch (error) {
        console.error('Favicon: Error serving favicon.ico:', error);

        // Check if headers have been sent to prevent crashing the server.
        if (!res.headersSent) {
            // If the file doesn't exist, send a 404 Not Found error.
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Favicon not found');
            } else {
                // For any other type of error, send a 500 Internal Server Error.
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        }
    }
}

module.exports = {
    display
};