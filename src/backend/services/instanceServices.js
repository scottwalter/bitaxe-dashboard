/**
 * @file This module acts as a controller to proxy requests to internal Bitaxe miner APIs.
 * It allows the main application to interact with Bitaxe devices without exposing them directly.
 * The functions in this module use the application's configuration to find the correct
 * Bitaxe instance URL and forward requests accordingly.
 */

const fetch = require('node-fetch');
const apiMapService = require('./apiMapService');



/**
 * Sends a restart command to a specific Bitaxe miner instance.
 *
 * @param {object} config - The application's configuration object, which contains the `bitaxe_instances` array.
 * @returns {Promise<object>} A promise that resolves to an object indicating success.
 * @throws {Error} If the instance is not found, or if the fetch request fails or returns a non-OK status.
 */
async function instanceRestart(req, res, config) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const instanceId = requestUrl.searchParams.get('instanceId');
  // Find the specific Bitaxe instance configuration from the array.
  const instance = config.bitaxe_instances.find(item => item[instanceId]);

    // If the instance is not found in the configuration, throw an error.
    if (!instance) {
        throw new Error(`Bitaxe instance "${instanceId}" not found in configuration.`);
    }

    // Construct the full URL for the restart API endpoint.
    const baseUrl = instance[instanceId];
    const apiPath = await apiMapService.getApiPath(config,'instanceRestart');
    const restartUrl = `${baseUrl}${apiPath}`;

    try {
        // Send a POST request to the Bitaxe's restart endpoint.
        const response = await fetch(restartUrl, {
            method: 'POST',
        });

        // Check if the HTTP response status is not OK (e.g., 4xx or 5xx).
        if (!response.ok) {
            // If not OK, throw an error with the status and response body for debugging.
            throw new Error(`HTTP error! Status: ${response.status}, Body: ${await response.text()}`);
        }
        // If successful, return a success status object.
        return { status: 'success', message: `Restart initiated for ${instanceId}` };
    } catch (error) {
        // Log any errors that occur during the fetch operation.
        console.error("Failed to restart Bitaxe:", error);
        // Re-throw the error to be handled by the caller.
        throw error;
    }
}
async function handleSetting(req, res, config) {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const instanceId = requestUrl.searchParams.get('instanceId');
    // Find the specific Bitaxe instance configuration from the array.
    const instance = config.bitaxe_instances.find(item => item[instanceId]);

    // If the instance is not found in the configuration, throw an error.
    if (!instance) {
        throw new Error(`Bitaxe instance "${instanceId}" not found in configuration.`);
    }

    // Construct the full URL for the settings API endpoint.
    const baseUrl = instance[instanceId];
    const apiPath = await apiMapService.getApiPath(config, 'instanceSettings');
    const settingsUrl = `${baseUrl}${apiPath}`;

    try {
        const body = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk) => {
                data += chunk.toString();
            });
            req.on('end', () => {
                resolve(data);
            });
            req.on('error', err => reject(err));
        });

        if (!body) {
            throw new Error('Request body cannot be empty.');
        }
        JSON.parse(body); // Validate that the body is valid JSON.

        // Send a PATCH request to the Bitaxe's settings endpoint.
        const response = await fetch(settingsUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
        });

        // Check if the HTTP response status is not OK (e.g., 4xx or 5xx).
        if (!response.ok) {
            // If not OK, throw an error with the status and response body for debugging.
            throw new Error(`HTTP error! Status: ${response.status}, Body: ${await response.text()}`);
        }
        // If successful, return a success status object.
        return { status: 'success', message: `Settings updated for ${instanceId}` };
    } catch (error) {
        console.error(`Failed to update settings for ${instanceId}:`, error);
        throw error;
    }
}
//Rest API paths for bitaxe-dashboard, which will map to AxeOS rest API calls.
const routes = [
    {
        path: '/api/instance/service/restart',
        method: 'POST',
        handler: instanceRestart,
        exactMatch: true
    },
    {
        path: '/api/instance/service/settings',
        method: 'PATCH',
        handler: handleSetting,
        exactMatch: true
    }
]
/**
 * Route request to the correct AxeOS rest API service and return the results to the apiRouter.js
 * @param {*} req 
 * @param {*} res 
 * @param {*} config 
 */
async function route(req, res, config){
    // First, check if settings are disabled in the configuration.
    if(config.disable_settings === true){
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Settings are disabled by configuration.' }));
        return;
    }

    // Use URL to parse pathname correctly, ignoring query strings for routing.
    const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
    const method = req.method;

    for (const r of routes) { // Renamed to 'r' to avoid conflict with function name 'route'
        let isMatch = false;
        if (r.exactMatch) {
            isMatch = urlPath === r.path;
        } else {
            isMatch = urlPath.startsWith(r.path);
        }

        if (isMatch && (method === r.method || r.method === 'ANY')) {
            try {
                // The handler is expected to return a result object on success.
                const result = await r.handler(req, res, config);
                
                // If the handler returns a result, send it as a successful JSON response.
                if (result && !res.headersSent) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                }
                // If the handler sent its own response, we do nothing.
            } catch (error) {
                console.error(`Error in instanceServices handler for ${urlPath}:`, error);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Internal Server Error', error: error.message }));
                }
            }
            return; // Request handled, exit the loop.
        }
    }

    // If no route within this sub-router matches.
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `Service endpoint not found at ${urlPath}` }));
}
module.exports = {
    route
};