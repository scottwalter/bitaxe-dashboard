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
 * @param {string} instanceName - The name of the Bitaxe instance to restart, as defined in the config file.
 * @param {object} config - The application's configuration object, which contains the `bitaxe_instances` array.
 * @returns {Promise<object>} A promise that resolves to an object indicating success.
 * @throws {Error} If the instance is not found, or if the fetch request fails or returns a non-OK status.
 */
async function instanceRestart(instanceName, config) {
  // Find the specific Bitaxe instance configuration from the array.
  const instance = config.bitaxe_instances.find(item => item[instanceName]);

    // If the instance is not found in the configuration, throw an error.
    if (!instance) {
        throw new Error(`Bitaxe instance "${instanceName}" not found in configuration.`);
    }

    // Construct the full URL for the restart API endpoint.
    const baseUrl = instance[instanceName];
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
        return { status: 'success', message: `Restart initiated for ${instanceName}` };
    } catch (error) {
        // Log any errors that occur during the fetch operation.
        console.error("Failed to restart Bitaxe:", error);
        // Re-throw the error to be handled by the caller.
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
    }
]
/**
 * Route request to the correct AxeOS rest API service and return the results to the apiRouter.js
 * @param {*} req 
 * @param {*} res 
 * @param {*} config 
 */
async function route(req, res, config){

}
module.exports = {
    route
};