/**
 * @file This module provides the data endpoint for the dashboard.
 * It aggregates data from all configured Bitaxe and Mining Core instances
 * and serves it as a single JSON object to be consumed by the client-side script.
 */

const fetch = require('node-fetch');
const apiPath = require('./services/apiMapService');




/**
 * Handles requests for the /api/systems/info endpoint.
 * It fetches data from all configured Bitaxe miner instances and an optional
 * Mining Core instance, then serves this data as a single JSON object.
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object.
 */
async function display(req, res, config) {
    // Constants for API endpoints
    const MINING_CORE_API_PATH = await apiPath.getApiPath(config,'pools'); // Endpoint for mining core stats
    const API_SYSTEM_INFO_PATH = await apiPath.getApiPath(config,'instanceInfo'); // Endpoint for miner info
    let allMinerData = []; // Array to store fetched data from all miner instances.

    try {
        // Ensure bitaxe_instances is a valid array; otherwise, use an empty array.
        const bitaxeInstances = Array.isArray(config.bitaxe_instances) ? config.bitaxe_instances : [];

        // Create an array of promises to fetch data from all miner instances concurrently.
        const instancePromises = bitaxeInstances.map(async (instance) => {
            // The instance object is expected to be in the format: { "minerName": "http://miner.url" }
            const instanceName = Object.keys(instance)[0];
            const instanceUrl = instance[instanceName];

            try {
                //console.log(`Fetching data for Bitaxe instance: ${instanceName} at ${instanceUrl}`);
                //console.log(`instanceInfoAPI: ${API_SYSTEM_INFO_PATH}`);
            
                const response = await fetch(instanceUrl + API_SYSTEM_INFO_PATH);
                if (!response.ok) {
                    console.error(`Error fetching data from ${instanceUrl}: ${response.status} ${response.statusText}`); // Log the HTTP error.
                    // Return a structured error object for this instance to be displayed on the frontend.
                    return {
                        id: instanceName, // Use the instance name as a unique identifier.
                        hostname: instanceName, // Use the instance name for display purposes.
                        status: 'Error',
                        message: `${response.status} ${response.statusText}` // Provide a clear error message.
                    };
                }
                const data = await response.json();
                // Add the instance name as a unique ID for client-side identification.
                data.id = instanceName;
                return data;
            } catch (fetchError) {
                console.error(`Network or JSON parsing error for ${instanceName} (${instanceUrl}):`, fetchError);
                return {
                    id: instanceName,
                    hostname: instanceName,
                    status: 'Error',
                    message: fetchError.message // Provide the full error message for debugging.
                };
            }
        });

        // Wait for all promises to resolve
        allMinerData = await Promise.all(instancePromises);

        // Prepare the combined data object to be sent as JSON.
        const embeddedData = {
            minerData: allMinerData,
            displayFields: config.display_fields || [],
            miningCoreData: null, // Initialize as null; will be populated if enabled.
            miningCoreDisplayFields: config.mining_core_display_fields || [],
        };

        // Conditionally fetch mining core data
        if (config.mining_core_enabled && config.mining_core_url) {
            try {
                const miningCoreResponse = await fetch(config.mining_core_url + MINING_CORE_API_PATH);
                if (!miningCoreResponse.ok) {
                    console.error(`Error fetching mining core data from ${config.mining_core_url}: ${miningCoreResponse.status} ${miningCoreResponse.statusText}`);
                } else {
                    const miningCoreJson = await miningCoreResponse.json();
                    embeddedData.miningCoreData = miningCoreJson.pools;
                }
            } catch (miningCoreError) {
                console.error(`Network or JSON parsing error for mining core (${config.mining_core_url}):`, miningCoreError);
            }
        }
        //Add if settings are enabled for the dashbaord
        embeddedData.disable_settings = config.disable_settings;
        //Add if configurations are enabled for the dashboard
        embeddedData.disable_configurations = config.disable_configurations;
        //Add if authentication is enabled for the dashboard
        embeddedData.disable_authentication = config.disable_authentication;        
        // Send the final JSON response
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(embeddedData, null, 2));
        
    } catch (error) {
        console.error('Server-side Error in embedded-data display:', error);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
        } else {
            console.error('Headers already sent, unable to send 500 error response. Original error:', error);
        }
    }
}

module.exports = {
    display
};
