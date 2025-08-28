/**
 * @file This module is responsible for generating and serving the application's login page.
 * It reads an HTML template, populates it with dynamic data from the configuration
 * (like the title and version), and sends it as the HTTP response.
 */
const fs = require('fs').promises;
const path = require('path');

/**
 * A utility function to safely format a number to two decimal places.
 * If the input is not a valid number, it returns 'N/A'.
 * @param {number|string} value The value to format.
 * @returns {string} The formatted number as a string, or 'N/A'.
 */
function safeToFixed(value) {
    return typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : 'N/A';
}

/**
 * Reads the `login.html` template, replaces placeholders with configuration data,
 * and serves the resulting HTML page. This function handles requests for the `/login` route.
 *
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application's global configuration object.
 * @param {string} config.title - The title for the web page.
 * @param {string} config.bitaxe_dashboard_version - The application's version number.
 */
async function display(req, res, config) {
    try {
        const htmlPath = path.join(__dirname, '.', 'pages', 'html', 'login.html');
        let htmlContent = await fs.readFile(htmlPath, 'utf-8');
        
        // Replace placeholders in the HTML template with dynamic values.
        htmlContent = htmlContent.replace(/<!-- TITLE -->/g, config.title || 'Bitaxe Dashboard');
        htmlContent = htmlContent.replace(/<!-- VERSION -->/g, safeToFixed(config.bitaxe_dashboard_version));
        htmlContent = htmlContent.replace(/<!-- CURRENT_YEAR -->/g, new Date().getFullYear());

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
    } catch (error) {
        console.error('Error serving login page:', error);
        // If an error occurs (e.g., file not found), send a 500 Internal Server Error response.
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    }
}

module.exports = {
    display
};