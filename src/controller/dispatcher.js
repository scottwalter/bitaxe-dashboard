const http = require('http'); // Not directly used in dispatch, but good for context
const fs = require('fs').promises; // Make sure you have fs.promises here
const path = require('path');

const dashboardPage = require('../pages/dashboard');
const faviconPage = require('./favicon.js');
const imageServer = require('./images.js');
const demoApiEndpoint = require('./demo-api');


// Define a constant for the public directory where client-side assets are stored
const PUBLIC_DIR = path.join(__dirname, '../public'); // Adjust if your public directory is elsewhere

// Define your routes as an array of objects for better organization
const routes = [
    {
        path: '/',
        method: 'GET',
        handler: dashboardPage.display,
        exactMatch: true // Indicates an exact URL match is required
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
        exactMatch: false // Indicates a prefix match
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
                const jsFilePath = path.join(PUBLIC_DIR, 'js', 'client-dashboard.js'); // Construct full path
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
    //Style Guide path
    {
        path: '/public/css/bitaxe-dashboard.css',
        method: 'GET',
        handler: async (req, res) => {
            try {
                const jsFilePath = path.join(PUBLIC_DIR, 'css', 'bitaxe-dashboard.css'); // Construct full path
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
    }
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

        // Iterate through defined routes to find a matching one
        for (const route of routes) {
            let isMatch = false;

            if (route.exactMatch) {
                isMatch = urlPath === route.path;
            } else { // Handle prefix matches for paths like /image/
                isMatch = urlPath.startsWith(route.path);
            }

            // Check if the URL path and HTTP method match the route
            if (isMatch && method === route.method) {
                //Call handler
                await route.handler(req, res, config);
                
                return; // Stop processing once a route is handled
            }
        }

        // If no route matches after checking all possibilities, send a 404 Not Found response
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found - Dispatcher');

    } catch (error) {
        // Centralized error logging for unexpected issues during dispatch or within handlers
        console.error(`ERROR in dispatcher for URL ${req.url} (${req.method}):`, error);

        // Only attempt to send an error response if headers haven't already been sent
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error - Dispatcher');
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