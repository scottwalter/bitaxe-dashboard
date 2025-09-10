/** 
 * @file This module provides an API endpoint to fetch detailed system information
 * from a specific Bitaxe miner instance. It acts as a proxy, forwarding the request
 * to the correct device based on an `instanceId`.
 */

// Dynamic import for node-fetch 3.x will be used inline
const apiPath = require('./services/apiMapService');
const { URL } = require('url'); // Import URL for parsing query parameters.

/**
 * Handles a GET request to fetch system info for a specific Bitaxe miner instance.
 * The request must include an `instanceId` as a URL query parameter (e.g., /api/instance/info?instanceId=MyAxe).
 * This allows the frontend to retrieve settings and stats for a single, specified device.
 *
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object.
 */
async function display(req, res, config) {
    // This endpoint only supports GET requests.
    if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed', message: 'This endpoint only accepts GET requests.' }));
        return;
    }
    
    try {
        // Construct a full URL to safely parse query parameters.
        const requestUrl = new URL(req.url, `http://${req.headers.host}`);
        const instanceId = requestUrl.searchParams.get('instanceId');

        if (!instanceId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bad Request', message: 'Missing "instanceId" query parameter.' }));
            return;
        }

        // Find the specific Bitaxe instance configuration from the array.
        const instance = config.bitaxe_instances.find(item => item[instanceId]);

        if (!instance) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not Found', message: `Bitaxe instance "${instanceId}" not found in configuration.` }));
            return;
        }

        // Get the correct API path from the centralized service.
        const API_SYSTEM_INFO_PATH = await apiPath.getApiPath(config, 'instanceInfo');
        const baseUrl = instance[instanceId];
        const infoUrl = `${baseUrl}${API_SYSTEM_INFO_PATH}`;

        // Use dynamic import for node-fetch 3.x compatibility
        const { default: fetch } = await import('node-fetch');
        
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
        console.error('instanceInfo handler error:', error);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
        }
    }
}
module.exports = {
    display
};