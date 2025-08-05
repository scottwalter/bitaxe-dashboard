// File Path: /Users/scottwalter/VSC-Projects/bitaxe-dashboard/src/pages/dashboard.js

const fs = require('fs').promises; // Use promise-based fs for async/await
const path = require('path');
const MINING_CORE_API_PATH = '/api/pools'; // Endpoint for mining core stats
const fetch = require('node-fetch'); // Make sure node-fetch is installed (npm install node-fetch@2)



const API_SYSTEM_INFO_PATH = '/api/system/info'; // Endpoint for miner info
/**
     * Safely formats a number to two decimal places, or returns 'N/A'.
     * @param {number|string} value
     * @returns {string}
     */
    function safeToFixed(value) {
        return typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : 'N/A';
    }
/**
 * Handles the dashboard display, fetching data and serving HTML with embedded data.
 * This is the server-side component.
 * @param {http.IncomingMessage} req The HTTP request object.
 * @param {http.ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object.
 */
async function display(req, res, config) {
    let allMinerData = []; // Array to store fetched data from all instances

    try {
        // Ensure bitaxe_instances is an array and filter out any non-object entries
        const bitaxeInstances = Array.isArray(config.bitaxe_instances) ? config.bitaxe_instances : [];

        // Use Promise.all to fetch all data concurrently
        const instancePromises = bitaxeInstances.map(async (instance) => {
            // Assuming instance structure like { "miner1": "http://192.168.1.100" }
            const instanceName = Object.keys(instance)[0];
            const instanceUrl = instance[instanceName];

            try {
                const response = await fetch(instanceUrl + API_SYSTEM_INFO_PATH);
                if (!response.ok) {
                    console.error(`Error fetching data from ${instanceUrl}: ${response.status} ${response.statusText}`);
                    // Return a basic error object for this instance
                    return {
                        id: instanceName, // Use instanceName as a unique ID for client-side lookup
                        hostname: instanceName, // Display instance name for errors
                        status: 'Error',
                        message: `${response.status} ${response.statusText}` // Error message
                    };
                }
                const data = await response.json();
                // Add a unique ID for client-side use (e.g., from config name)
                data.id = instanceName;
                return data;
            } catch (fetchError) {
                console.error(`Network or JSON parsing error for ${instanceName} (${instanceUrl}):`, fetchError);
                return {
                    id: instanceName, // Use instanceName as a unique ID
                    hostname: instanceName, // Display instance name for errors
                    status: 'Error',
                    message: fetchError.message // Full error message
                };
            }
        });

        // Wait for all promises to resolve
        allMinerData = await Promise.all(instancePromises);

        // Prepare the combined data object to be embedded
        const embeddedData = {
            minerData: allMinerData,
            displayFields: config.display_fields || [],
            miningCoreData: null, // Initialize miningCoreData to null
            miningCoreDisplayFields: config.mining_core_display_fields || []
        };

        // Conditionally fetch mining core data
        if (config.mining_core_enabled && config.mining_core_url) {
            try {
                const miningCoreResponse = await fetch(config.mining_core_url + MINING_CORE_API_PATH);
                if (!miningCoreResponse.ok) {
                    console.error(`Error fetching mining core data from ${config.mining_core_url}: ${miningCoreResponse.status} ${miningCoreResponse.statusText}`);
                } else {
                    const miningCoreJson = await miningCoreResponse.json();
                    embeddedData.miningCoreData = miningCoreJson;
                }
            } catch (miningCoreError) {
                console.error(`Network or JSON parsing error for mining core (${config.mining_core_url}):`, miningCoreError);
            }
        }

        // Read the dashboard HTML template
        const dashboardHtmlPath = path.join(__dirname, '../pages/html/dashboard.html');
        let htmlContent = await fs.readFile(dashboardHtmlPath, 'utf8');

        // Embed the fetched data as a JSON string within a script tag
        const embeddedDataHtml = `
${JSON.stringify(embeddedData, null, 2)}
`;
        htmlContent = htmlContent.replace('<!-- EMBEDDED_DATA -->', embeddedDataHtml);

        // Replace other placeholders (title, timestamp, current year)
        const currentYear = new Date().getFullYear().toString();
        htmlContent = htmlContent.replace(/<!-- TITLE -->/g, config.title || 'Bitaxe Dashboard');
        htmlContent = htmlContent.replace('<!-- TIMESTAMP -->', new Date().toLocaleString());
        htmlContent = htmlContent.replace('<!-- CURRENT_YEAR -->', currentYear);
        htmlContent = htmlContent.replace('<!-- VERSION -->', safeToFixed(config.bitaxe_dashboard_version));

        // Send the final HTML response
        res.writeHead(200, { 'Content-Type': 'text/html' });
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
