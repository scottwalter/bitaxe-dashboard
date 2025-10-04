/**
 * @file Bootstrap Router - Handles HTTP routing during first-time application setup.
 * 
 * This module provides a specialized router that operates when the application
 * is in bootstrap mode (when configuration files are missing). It serves the
 * bootstrap setup page, handles static assets, and processes configuration
 * form submissions with device validation.
 * 
 * @author Scott Walter
 * @version 2.0.0
 * @since 2.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const url = require('url');

/** 
 * Path to the public directory containing static assets.
 * @constant {string}
 */
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/** 
 * Path to the bootstrap HTML template file.
 * @constant {string}
 */
const BOOTSTRAP_HTML_PATH = path.join(__dirname, 'pages', 'html', 'bootstrap.html');

/**
 * MIME type mappings for static file serving.
 * @constant {Object.<string, string>}
 */
const MIME_TYPES = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

/**
 * Serves static assets (CSS, JS, images) during bootstrap mode.
 * 
 * Provides secure static file serving with directory traversal protection
 * and appropriate MIME type headers.
 * 
 * @async
 * @function serveStaticAsset
 * @param {http.IncomingMessage} req - The HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 * @returns {Promise<void>} Promise that resolves when response is sent
 * @throws {Error} Handles file system errors internally
 */
async function serveStaticAsset(req, res) {
    try {
        const relativePath = path.normalize(req.url.substring('/public/'.length));
        const filePath = path.join(PUBLIC_DIR, relativePath);

        if (!filePath.startsWith(PUBLIC_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            return res.end('Forbidden');
        }

        const fileContent = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fileContent);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
        } else {
            console.error('Error serving static asset:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal server error');
        }
    }
}

/**
 * Serves the bootstrap configuration setup HTML page.
 * 
 * Loads the bootstrap HTML template and replaces placeholders with
 * dynamic content such as title, version, and current year.
 * 
 * @async
 * @function serveBootstrapPage
 * @param {http.IncomingMessage} req - The HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 * @returns {Promise<void>} Promise that resolves when response is sent
 * @throws {Error} Handles template loading errors internally
 */
async function serveBootstrapPage(req, res) {
    try {
        let htmlContent = await fs.readFile(BOOTSTRAP_HTML_PATH, 'utf8');
        
        // Replace placeholders
        htmlContent = htmlContent.replace(/<!-- TITLE -->/g, 'Bitaxe Dashboard - First Time Setup');
        htmlContent = htmlContent.replace(/<!-- VERSION -->/g, '3.0');
        htmlContent = htmlContent.replace(/<!-- CURRENT_YEAR -->/g, new Date().getFullYear().toString());

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
    } catch (error) {
        console.error('Error serving bootstrap page:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
    }
}

/**
 * Handles bootstrap configuration form submission with device validation.
 * 
 * Processes POST requests containing bootstrap configuration data,
 * validates device URLs by testing connectivity, and creates configuration
 * files if validation passes.
 * 
 * @async
 * @function handleBootstrapSubmission
 * @param {http.IncomingMessage} req - The HTTP request object containing form data
 * @param {http.ServerResponse} res - The HTTP response object for sending results
 * @returns {Promise<void>} Promise that resolves when response is sent
 * @throws {Error} Handles validation and processing errors internally
 */
async function handleBootstrapSubmission(req, res) {
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        return res.end('Method not allowed');
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            const formData = JSON.parse(body);
            // Dynamically import the bootstrap service to avoid loading dependencies at startup
            const bootstrapService = require('./services/bootStrapService');
            const result = await bootstrapService.createConfigFiles(formData);
            
            if (result.success) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Configuration created successfully. Please restart the server.' }));
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: result.error }));
            }
        } catch (error) {
            console.error('Error processing bootstrap form:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
        }
    });
}

/**
 * Main bootstrap router function - handles all requests during bootstrap mode.
 * 
 * Routes requests to appropriate handlers based on URL path:
 * - Static assets (CSS, JS, images) from /public/
 * - Form submissions to /bootstrap
 * - Status checks to /bootstrap/status
 * - All other requests serve the bootstrap setup page
 * 
 * @async
 * @function route
 * @param {http.IncomingMessage} req - The HTTP request object
 * @param {http.ServerResponse} res - The HTTP response object
 * @returns {Promise<void>} Promise that resolves when request is handled
 * @throws {Error} Handles routing errors internally with 500 response
 */
async function route(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const urlPath = parsedUrl.pathname;

    try {
        // Handle static assets
        if (urlPath.startsWith('/public/')) {
            return await serveStaticAsset(req, res);
        }

        // Handle bootstrap form submission
        if (urlPath === '/bootstrap' && req.method === 'POST') {
            return await handleBootstrapSubmission(req, res);
        }

        // Handle status check after bootstrap completion
        if (urlPath === '/bootstrap/status' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'complete' }));
        }

        // Handle all other requests - serve bootstrap page
        return await serveBootstrapPage(req, res);
        
    } catch (error) {
        console.error('Bootstrap router error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
    }
}

module.exports = { route };