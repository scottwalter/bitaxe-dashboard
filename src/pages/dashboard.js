/**
 * @file This module is responsible for generating and serving the main dashboard page.
 * It grabs the HTML template, adds version and timestamp and sends it back the http response.
 * The clientDashboard.js and embeddedData.js do all the real work, this is just a simple entry point.
 */

const fs = require('fs').promises; // Use promise-based fs for async/await
const path = require('path');
/**
 * Safely formats a number to two decimal places, or returns 'N/A'.
 * @param {number|string} value The value to format.
 * @returns {string} The formatted number as a string, or 'N/A'.
 */
function safeToFixed(value) {
    return typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : 'N/A';
}
/**
 * Handles the dashboard display, serving HTML with clientDashboard.js script being called.
 * This function acts as the main controller for the dashboard page.
 * @param {http.IncomingMessage} req The HTTP request object.
 * @param {http.ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object.
 */
async function display(req, res, config) {
    try {
        //console.log('dashboard.js invoked');
        // Read the dashboard HTML template
        const dashboardHtmlPath = path.join(__dirname, '../pages/html/dashboard.html');
        let htmlContent = await fs.readFile(dashboardHtmlPath, 'utf8');
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
