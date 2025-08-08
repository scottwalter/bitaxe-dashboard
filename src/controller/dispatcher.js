/**
 * @file This module acts as the central request router for the application.
 * It maps incoming HTTP requests to the appropriate handler based on the URL path and method.
 * It handles serving dynamic pages, static assets (CSS, JS), and API endpoints.
 */

const http = require('http'); // Used for JSDoc type definitions (req, res).
const fs = require('fs').promises;
const path = require('path');

const dashboardPage = require('../pages/dashboard');
const faviconPage = require('./favicon.js');
const imageServer = require('./images.js');
const demoApiEndpoint = require('./demo-api');

// Define a constant for the public directory where client-side assets are stored
const PUBLIC_DIR = path.join(__dirname, '../public');

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
        path: '/favicon.ico',
        method: 'GET',
        handler: faviconPage.display,
        exactMatch: true
    },
    {
        path: '/image/', // This will match any URL starting with /image/
        method: 'GET',
        handler: imageServer.display,
        exactMatch: false // Allows for prefix matching (e.g., /image/logo.png).
    },
    {
        path: '/api/system/info',
        method: 'GET',
        handler: demoApiEndpoint.display,
        exactMatch: true
    },
    {
        path:'/api/pools',
        method: 'GET',
        handler: demoApiEndpoint.display,
        exactMatch: true
    },
    {
        path: '/public/js/client-dashboard.js',
        method: 'GET',
        handler: async (req, res) => {
            try {
                const jsFilePath = path.join(PUBLIC_DIR, 'js', 'client-dashboard.js');
                const jsContent = await fs.readFile(jsFilePath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end(jsContent);
            } catch (err) {
                console.error('Error serving client-dashboard.js:', err);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading client script.');
                }
            }
        },
        exactMatch: true
    },
    // Style Sheet path
    {
        path: '/public/css/bitaxe-dashboard.css',
        method: 'GET',
        handler: async (req, res) => {
            try {
                const jsFilePath = path.join(PUBLIC_DIR, 'css', 'bitaxe-dashboard.css');
                const jsContent = await fs.readFile(jsFilePath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'text/css' });
                res.end(jsContent);
            } catch (err) {
                console.error('Error serving bitaxe-dashboard.css:', err);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Error loading client script.');
                }
            }
        },
        exactMatch: true
    },
    // Add more routes here as your application grows
];

/**
 * Dispatches the incoming HTTP request to the appropriate handler.
 * @param {http.IncomingMessage} req The request object.
 * @param {http.ServerResponse} res The response object.
 * @param {object} config The application configuration object.
 */
async function dispatch(req, res, config) {
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
            if (isMatch && method === route.method) {
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
        console.error(`ERROR in dispatcher for URL ${req.url} (${req.method}):`, error);

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
    dispatch
};