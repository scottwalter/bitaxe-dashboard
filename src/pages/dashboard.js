const http = require('http');
const fs = require('fs').promises; // Use the promise-based fs module
const path = require('path');
const fetch = require('node-fetch'); // Assuming node-fetch is installed (npm install node-fetch@2)

const apiPath = '/api/system/info';

/**
 * Generates collapsible HTML for a single device's data.
 * @param {object} data - The device data object.
 * @param {string[]} fieldsToDisplay - An array of fields to display in the collapsible content.
 * @returns {string} The HTML string for the collapsible section.
 */
function generateCollapsibleHtml(data, fieldsToDisplay) {
    // Ensure data properties are numbers before calling toFixed, or handle N/A
    const safeToFixed = (value) => typeof value === 'number' ? value.toFixed(2) : 'N/A';

    let contentHtml = '';
    fieldsToDisplay.forEach(field => {
        let displayValue = data[field] !== undefined ? data[field] : 'N/A';

        // Apply toFixed only to specific numeric fields
        if (['hashRate', 'power', 'voltage'].includes(field) && typeof data[field] === 'number') {
            displayValue = safeToFixed(data[field]);
        }

        contentHtml += `
            <p><strong>${field}:</strong> ${displayValue}</p>`;
    });

    // Safely get header values, providing default/N/A if not available or not numeric
    const hostname = data.hostname || 'Unknown Host';
    const hashRateHeader = safeToFixed(data.hashRate);
    const bestSessionDiff = data.bestSessionDiff || 'N/A';
    const sharesAccepted = data.sharesAccepted || 'N/A';
    const sharesRejected = data.sharesRejected || 'N/A';
    const temp = data.temp || 'N/A';
    const vrTemp = data.vrTemp || 'N/A';

    const html = `
    <div class="collapsible-container">
        <button class="collapsible-button">
            ${hostname} - HR:${hashRateHeader} - SD:${bestSessionDiff} - SA:${sharesAccepted} - SR:${sharesRejected} - T:${temp} - VT:${vrTemp}
        </button>
        <div class="collapsible-content">
            ${contentHtml}
        </div>
    </div>`;
    return html;
}

/**
 * Main display function to serve the dashboard.
 * @param {http.IncomingMessage} req - The HTTP request object.
 * @param {http.ServerResponse} res - The HTTP response object.
 * @param {object} config - Configuration object containing bitaxe instances and display fields.
 */
async function display(req, res, config) {
    let tablesHtml = ''; // Initialize outside the try block for broader scope if needed

    try {
        const filterFields = config.display_fields;

        // Use Promise.all to fetch all data concurrently
        const instancePromises = config.bitaxe_instances.map(async (instance) => {
            // Assuming instance structure like { "miner1": "http://192.168.1.100" }
            const instanceName = Object.keys(instance)[0];
            const instanceUrl = instance[instanceName];

            try {
                const response = await fetch(instanceUrl + apiPath);
                if (!response.ok) {
                    // Handle non-2xx responses from the API gracefully
                    console.error(`Error fetching data from ${instanceUrl}: ${response.status} ${response.statusText}`);
                    // Return a placeholder HTML for failed instances
                    return `<div class="collapsible-container"><button class="collapsible-button error">${instanceName} - Error: ${response.status} ${response.statusText}</button><div class="collapsible-content"><p>Failed to fetch data.</p></div></div>`;
                }
                const data = await response.json();
                return generateCollapsibleHtml(data, filterFields);
            } catch (fetchError) {
                // Handle network errors or JSON parsing errors for a specific instance
                console.error(`Network or JSON error for ${instanceName} (${instanceUrl}):`, fetchError);
                return `<div class="collapsible-container"><button class="collapsible-button error">${instanceName} - Connection Error</button><div class="collapsible-content"><p>Could not connect or parse data: ${fetchError.message}</p></div></div>`;
            }
        });

        const instanceHtmls = await Promise.all(instancePromises);
        tablesHtml = instanceHtmls.join(''); // Join all the generated HTML strings

        console.log(`Config: ${JSON.stringify(config.bitaxe_instances)}`);

        // Read the dashboard HTML template using fs.promises.readFile
        const dashboardHtmlPath = path.join(__dirname, './html/dashboard.html');
        let htmlContent = await fs.readFile(dashboardHtmlPath, 'utf8');

        // Replace placeholders in the HTML template
        let finalHtml = htmlContent.replace('<!-- DATA_TABLE -->', tablesHtml);
        finalHtml = finalHtml.replace('<!-- TITLE -->', config.title || 'Bitaxe Dashboard'); // Provide a default title
        finalHtml = finalHtml.replace('<!-- TIMESTAMP -->', new Date().toISOString());

        // Send the final HTML response
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(finalHtml);

    } catch (error) {
        console.error('Overall Error in display function:', error);
        // Only attempt to send an error response if headers haven't already been sent
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error</h1><p>An internal server error occurred.</p><p>Details: ${error.message}</p>`);
        } else {
            console.error('Headers already sent, cannot send 500 error response. Original error:', error);
        }
    }
    // Removed `return '1';` as it serves no purpose in an HTTP handler.
}

module.exports = {
    display
};