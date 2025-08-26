/** 
 * @file This file is to pull the JSON system info for a specific Bitaxe instance.
 * It is used to populate the Settings page with the current values for a selected miner.
 */

const fetch = require('node-fetch');
// System info API for AxeOS
const API_SYSTEM_INFO_PATH = '/api/system/info'; // Endpoint for miner info

/**
 * Handles a POST request to fetch system info for a specific Bitaxe miner instance.
 * The request body must be a JSON object containing an `instanceId` key.
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object.
 */
async function display(req, res, config) {
    console.log('instanceData request received');
    // This endpoint only supports GET requests.
    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed', message: 'This endpoint only accepts GET requests.' }));
        return;
    }

    let body = '';
    // Collect the request body chunks.
    req.on('data', chunk => {
        body += chunk.toString();
    });

    // Once the entire body is received, process it.
    req.on('end', async () => {
        try {
            // The body is expected to be JSON, e.g., { "instanceId": "Bitaxe1" }
            const postData = JSON.parse(body);
            const instanceId = postData.instanceId;

            if (!instanceId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Bad Request', message: 'Missing "instanceId" in request body.' }));
                return;
            }

            // Find the specific Bitaxe instance configuration from the array.
            const instance = config.bitaxe_instances.find(item => item[instanceId]);

            if (!instance) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not Found', message: `Bitaxe instance "${instanceId}" not found in configuration.` }));
                return;
            }

            // Construct the full URL for the system info API endpoint.
            const baseUrl = instance[instanceId];
            const infoUrl = `${baseUrl}${API_SYSTEM_INFO_PATH}`;

            // Fetch the data from the Bitaxe device.
            const response = await fetch(infoUrl);
            if (!response.ok) {
                const errorText = await response.text();
                // Proxy the error from the device back to the client.
                res.writeHead(response.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: `Failed to fetch data from Bitaxe instance`,
                    message: `HTTP error! Status: ${response.status}, Body: ${errorText}`
                }));
                return;
            }

            // If successful, send the device's system info back to the client.
            const minerData = await response.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(minerData));

        } catch (error) {
            console.error('instanceData error:', error);
            if (error instanceof SyntaxError) {
                // Handle cases where the request body is not valid JSON.
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Bad Request', message: 'Invalid JSON in request body.' }));
            } else if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
            }
        }
    });
}
module.exports = {
    display
};