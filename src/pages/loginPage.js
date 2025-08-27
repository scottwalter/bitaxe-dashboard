/**
 * @file Serves the login page.
 */
const fs = require('fs').promises;
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
 * Reads and serves the login.html file.
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object.
 */
async function display(req, res, config) {
    try {
        const htmlPath = path.join(__dirname, 'html', 'login.html');
        let htmlContent = await fs.readFile(htmlPath, 'utf-8');
        
        // Replace title placeholder with the one from config
        htmlContent = htmlContent.replace(/<!-- TITLE -->/g, config.title || 'Bitaxe Dashboard');
        htmlContent = htmlContent.replace(/<!-- VERSION -->/g, safeToFixed(config.bitaxe_dashboard_version));
        htmlContent = htmlContent.replace(/<!-- CURRENT_YEAR -->/g, new Date().getFullYear());

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
    } catch (error) {
        console.error('Error serving login page:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}

module.exports = {
    display
};