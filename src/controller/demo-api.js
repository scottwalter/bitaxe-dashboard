const fs = require('fs').promises;
const path = require('path');

// Define API endpoints and their corresponding JSON files
const API_ENDPOINT_MAP = {
    '/api/pools': 'mining-core.json',
    '/api/system/info': 'bitaxe-info.json',
    // Add more API mappings here
};

// Define the directory where demo API JSON files are located
const DEMO_API_DIRECTORY = path.join(__dirname, '../demo-apis');

async function display(req, res) {
    try {
        const requestedFile = API_ENDPOINT_MAP[req.url];

        // If the requested URL is not in our defined API map
        if (!requestedFile) {
            console.warn(`Demo API: Unknown endpoint requested: ${req.url}`);
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end('<h1>404 Not Found</h1><p>The requested API endpoint does not exist.</p>');
        }

        const filePath = path.join(DEMO_API_DIRECTORY, requestedFile);
        console.log(`Demo API: Attempting to serve: ${filePath}`);

        const fileData = await fs.readFile(filePath);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(fileData);

    } catch (error) {
        console.error('Demo API Error:', error);

        // Check for specific error types, e.g., file not found
        if (error.code === 'ENOENT') {
            if (!res.headersSent) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                return res.end(`<h1>404 Not Found</h1><p>The data file for this API endpoint was not found: ${error.message}</p>`);
            }
        }

        // Generic internal server error
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>500 Internal Server Error</h1><p>An unexpected error occurred: ${error.message}</p>`);
        } else {
            // If headers were already sent, just log the error
            console.error('Demo API: Headers already sent, cannot send new error response. Original error:', error);
        }
    }
}

module.exports = {
    display
};
