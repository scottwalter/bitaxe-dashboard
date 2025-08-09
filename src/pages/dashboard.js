/**
 * @file This module is responsible for generating and serving the main dashboard page.
 * It fetches data from all configured Bitaxe miner instances and an optional Mining Core instance,
 * then injects this data into an HTML template before sending it to the client.
 */

const fs = require('fs').promises; // Use promise-based fs for async/await
const path = require('path');
const fetch = require('node-fetch');

// Constants for API endpoints
const MINING_CORE_API_PATH = '/api/pools'; // Endpoint for mining core stats
const API_SYSTEM_INFO_PATH = '/api/system/info'; // Endpoint for miner info

/**
 * Safely formats a number to two decimal places, or returns 'N/A'.
 * @param {number|string} value The value to format.
 * @returns {string} The formatted number as a string, or 'N/A'.
 */
function safeToFixed(value) {
    return typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : 'N/A';
}
/**
 * Handles the dashboard display, fetching data and serving HTML with embedded data.
 * This function acts as the main controller for the dashboard page.
 * @param {http.IncomingMessage} req The HTTP request object.
 * @param {http.ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object.
 */
async function display(req, res, config) {
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

        // Prepare the combined data object to be embedded into the HTML.
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

        // Read the dashboard HTML template
        const dashboardHtmlPath = path.join(__dirname, '../pages/html/dashboard.html');
        let htmlContent = await fs.readFile(dashboardHtmlPath, 'utf8');

        // Embed the fetched data as a JSON string inside a designated placeholder in the HTML.
        const embeddedDataHtml = `
${JSON.stringify(embeddedData, null, 2)}
`;
        htmlContent = htmlContent.replace('<!-- EMBEDDED_DATA -->', embeddedDataHtml);

        // Replace other placeholders in the HTML template.
        const currentYear = new Date().getFullYear().toString();
        htmlContent = htmlContent.replace(/<!-- TITLE -->/g, config.title || 'Bitaxe Dashboard');
        htmlContent = htmlContent.replace('<!-- TIMESTAMP -->', new Date().toLocaleString());
        htmlContent = htmlContent.replace('<!-- CURRENT_YEAR -->', currentYear);
        htmlContent = htmlContent.replace(/<!-- VERSION -->/g, safeToFixed(config.bitaxe_dashboard_version));

        // Send the final HTML response
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);

    } catch (error) {
        console.error('Server-side Error in dashboard display:', error);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error</h1><p>An internal server error occurred while preparing the dashboard.</p><p>Details: ${error.message}</p>`);
        } else {
            console.error('Headers already sent, unable to send 500 error response. Original error:', error);
        }
    }
}

module.exports = {
    display
};
