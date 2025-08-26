/**
 * @file this file is used to route internal api calls
 * It is a bit cleaner than trying to add all the api routes to the router.js
 * Instead, router.js just sends anything with /api to this apiRouter and it handles the routing to the correct js module.
 */
//Import all of the various js modules for internal api calls.
const instanceInfo = require('./instanceInfo');
const systemsInfo = require('./systemsInfo');
const instanceServices = require('./instanceServices');


//Create the routing map
const routes = [
    {   
        path: '/api/instance/info',
        method: 'GET',
        handler: instanceInfo.display,
        exactMatch: true
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
    // Add more routes here as your application grows
    
]
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