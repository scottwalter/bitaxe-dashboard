/**
 * @file This module acts as the central request router for the application.
 * It maps incoming HTTP requests to the appropriate handler based on the URL path and method.
 * It handles serving dynamic pages, static assets (CSS, JS), and API endpoints.
 */

const http = require('http'); // Used for JSDoc type definitions (req, res).
const fs = require('fs').promises;
const path = require('path');

const dashboardPage = require('../pages/dashboard');
const demoApiRouter = require('./demoApiRouter');
const apiRouter = require('./apiRouter');


// Define a constant for the public directory where client-side assets are stored
const PUBLIC_DIR = path.join(__dirname, '../public');

// A map of file extensions to their corresponding MIME types for static assets.
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
 * Serves a static asset from the public directory.
 * This function is a generic handler for any file inside `/public`.
 * It includes security checks to prevent directory traversal attacks.
 * @param {http.IncomingMessage} req The request object.
 * @param {http.ServerResponse} res The response object.
 */
async function serveStaticAsset(req, res) {
    try {
        // Get the relative path from the URL, e.g., /public/css/style.css -> css/style.css
        const relativePath = path.normalize(req.url.substring('/public/'.length));
        const filePath = path.join(PUBLIC_DIR, relativePath);

        // Security check: ensure the resolved path is still within the public directory.
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
            res.end('Not Found');
        } else {
            console.error(`Error serving static asset ${req.url}:`, error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    }
}
// Defines the application's routes. Each route object specifies a path,
// an HTTP method, the handler function, and whether the path requires an exact match.
const routes = [
    {
        path: '/',
        method: 'GET',
        handler: dashboardPage.display,
        exactMatch: true // Requires an exact URL match.
    },
    {
        path: '/index.html',
        method: 'GET',
        handler: dashboardPage.display,
        exactMatch: true
    },
    {
        path: '/demo/api/',
        method: 'GET',
        handler: demoApiRouter.route,
        exactMatch: false
    },
    // Generic handler for all static assets in the /public/ directory.
    {
        path: '/public/',
        method: 'GET',
        handler: serveStaticAsset,
        exactMatch: false // Allows for prefix matching (e.g., /public/css/style.css).
    },
    {
        path: '/api/',
        method: 'ANY',
        handler: apiRouter.route,
        exactMatch: false
    },
    // Add more routes here as your application grows
];

/**
 * Dispatches the incoming HTTP request to the appropriate handler.
 * @param {http.IncomingMessage} req The request object.
 * @param {http.ServerResponse} res The response object.
 * @param {object} config The application configuration object.
 */
async function route(req, res, config) {
    try {
        const urlPath = req.url;
        const method = req.method;

        // Find a matching route based on the request URL and method.
        for (const route of routes) {
            let isMatch = false;

            if (route.exactMatch) {
                isMatch = urlPath === route.path;
            } else {
                // Handle prefix matches for paths like /image/
                isMatch = urlPath.startsWith(route.path);
            }

            // If a match is found, execute its handler and stop processing.
            if (isMatch && method === route.method || isMatch && route.method==='ANY') {
                // Execute the matched route's handler function.
                await route.handler(req, res, config);
                return; // Exit after handling the request.
            }
        }

        // If no route matches after checking all possibilities, send a 404 Not Found response
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');

    } catch (error) {
        // Centralized error logging for any uncaught exceptions during dispatch or in handlers.
        console.error(`ERROR in router for URL ${req.url} (${req.method}):`, error);

        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
        } else {
            // If headers were already sent, we can't send a new error response,
            // but we should still log the issue.
            console.error('Headers already sent, unable to send 500 error response. Original error:', error);
        }
    }
}

module.exports = {
    route
};