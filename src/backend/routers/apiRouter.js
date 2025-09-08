/**
 * @file This module serves as a dedicated sub-router for all API requests.
 * It receives requests prefixed with `/api/` from the main router and delegates them
 * to the appropriate controller module based on a defined routing map. This approach
 * keeps the main router clean and organizes API-specific logic.
 */

// Import all of the various controller modules for internal API calls.
const instanceInfo = require('../instanceInfo');
const systemsInfo = require('../systemsInfo');
const instanceServices = require('../services/instanceServices');
const authController = require('../authController');
const configurationServices = require('../services/configurationServices');

/**
 * Defines the routing map for all internal API endpoints. Each route object specifies:
 * - `path`: The URL path for the endpoint.
 * - `method`: The HTTP method (e.g., 'GET', 'POST', 'ANY').
 * - `handler`: The controller function that will handle the request.
 * - `exactMatch`: A boolean indicating if the path must be an exact match or a prefix match.
 * @const {Array<object>}
 */
const routes = [
    {   
        path: '/api/instance/info',
        method: 'GET',
        handler: instanceInfo.display,
        exactMatch: false
    },
    {
        path: '/api/systems/info',
        method: 'GET',
        handler: systemsInfo.display,
        exactMatch: true
    },
    {
        path: '/api/instance/service',
        method: 'ANY',
        handler: instanceServices.route,
        exactMatch: false
    },
    {
        path: '/api/login',
        method: 'POST',
        handler: authController.handleLogin,
        exactMatch: true
    },
    {
        path: '/api/logout',
        method: 'ANY',
        handler: authController.handleLogout,
        exactMatch: true
    },
    {
        path: '/api/configuration',
        method: 'ANY',
        handler: configurationServices.route,
        exactMatch: true
    }
    // Add more routes here as your application grows
    
]

/**
 * Dispatches an incoming API request to the correct handler function.
 * It iterates through the `routes` array, finds the first matching route based on
 * the request's URL path and method, and then executes its handler.
 * If no route is matched, it sends a 404 Not Found response.
 * Includes centralized error handling for all API routes.
 *
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application's global configuration object.
 */
async function route(req, res, config){
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
            console.error(`ERROR in apiRouter for URL ${req.url} (${req.method}):`, error);
    
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

module.exports={
    route
};