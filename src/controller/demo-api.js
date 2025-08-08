/**
 * @file This module provides a mock API endpoint handler for the application's demo mode.
 * It intercepts specific API calls and returns predefined JSON data from local files,
 * simulating the behavior of live Bitaxe and Mining Core APIs without needing
 * actual devices or services.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * A map of API URL paths to their corresponding static JSON data files.
 * This allows the handler to serve the correct mock data for a given endpoint.
 */
const API_ENDPOINT_MAP = {
    '/api/pools': 'mining-core.json',
    '/api/system/info': 'bitaxe-info.json',
};

/** The directory where the demo API JSON files are stored. */
const DEMO_API_DIRECTORY = path.join(__dirname, '../demo-apis');

/**
 * Handles incoming requests for demo API endpoints.
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object (not used in this handler).
 */
async function display(req, res, config) {
    try {
        const requestedFile = API_ENDPOINT_MAP[req.url];

        // If the requested URL is not a configured demo endpoint, return 404.
        if (!requestedFile) {
            console.warn(`Demo API: Unknown endpoint requested: ${req.url}`);
            res.writeHead(404, { 'Content-Type': 'text/html' });
            return res.end('<h1>404 Not Found</h1><p>The requested API endpoint does not exist.</p>');
        }

        const filePath = path.join(DEMO_API_DIRECTORY, requestedFile);
        console.log(`Demo API: Attempting to serve: ${filePath}`);

        // Read the corresponding JSON file from the filesystem.
        const fileData = await fs.readFile(filePath);

        // Send the JSON data as the response.
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(fileData);

    } catch (error) {
        console.error('Demo API Error:', error);

        // Handle file-not-found errors specifically.
        if (error.code === 'ENOENT') {
            if (!res.headersSent) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                return res.end(`<h1>404 Not Found</h1><p>The data file for this API endpoint was not found: ${error.message}</p>`);
            }
        }

        // For any other errors, return a generic 500 Internal Server Error.
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>500 Internal Server Error</h1><p>An unexpected error occurred: ${error.message}</p>`);
        } else {
            // If headers were already sent, we can't send a new response, so just log the error.
            console.error('Demo API: Headers already sent, cannot send new error response. Original error:', error);
        }
    }
}

module.exports = {
    display
};
