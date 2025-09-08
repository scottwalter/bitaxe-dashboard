/**
 * @file Central HTTP request router for the Bitaxe Dashboard application.
 * 
 * This module provides the main routing logic for the application during normal
 * operation mode. It handles URL-based routing to different handlers including
 * dashboard pages, API endpoints, static assets, and authentication flows.
 * 
 * Features:
 * - JWT-based authentication middleware
 * - Static asset serving with MIME type detection
 * - Route-based handler dispatch
 * - User session management
 * - Security middleware integration
 * 
 * @author Scott Walter
 * @version 2.0.0
 * @since 1.0.0
 */

const http = require('http'); // Used for JSDoc type definitions (req, res).
const fs = require('fs').promises;
const path = require('path');

const dashboardPage = require('../dashboard');
const loginPage = require('../loginPage');
const demoApiRouter = require('./demoApiRouter');
const apiRouter = require('./apiRouter');
const jwTokenServices = require('../services/jwTokenServices');


/**
 * Path to the public directory containing client-side static assets.
 * @constant {string}
 */
const PUBLIC_DIR = path.join(__dirname, '..','..','public');

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

/**
 * Parses cookies from the request headers.
 * @param {http.IncomingMessage} req The request object.
 * @returns {object} An object of key-value pairs for cookies.
 */
function parseCookies(req) {
    const list = {};
    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader) return list;

    cookieHeader.split(';').forEach(function(cookie) {
        let [ name, ...rest] = cookie.split('=');
        name = name?.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        if (!value) return;
        list[name] = decodeURIComponent(value);
    });

    return list;
}
// Defines the application's routes. Each route object specifies a path,
// an HTTP method, the handler function, and whether the path requires an exact match.
const routes = [
    {
        path: '/',
        method: 'GET',
        handler: dashboardPage.display,
        exactMatch: true, // Requires an exact URL match.
        requireJWT: true, // Requires a valid sessionToken
        sendUserInfo: true //Send the user json with request
    },
    {
        path: '/index.html',
        method: 'GET',
        handler: dashboardPage.display,
        exactMatch: true,
        requireJWT: true,
        sendUserInfo: true 
    },
    {
        path: '/demo/api/',
        method: 'GET',
        handler: demoApiRouter.route,
        exactMatch: false,
        requireJWT: false, // Requires a valid sessionToken
        sendUserInfo: false //Don't Send the user json with request
    },
    // Generic handler for all static assets in the /public/ directory.
    {
        path: '/public/',
        method: 'GET',
        handler: serveStaticAsset,
        exactMatch: false,
        requireJWT: false, // Does not require a valid sessionToken
        sendUserInfo: false //Don't Send the user json with request
    },
    {
        path: '/api/login',
        method: 'POST',
        handler: apiRouter.route,
        exactMatch: true,
        requireJWT: false, // Does not require a valid sessionToken
        sendUserInfo: false //Don't Send the user json with request
    },
    {
        path: '/api/logout',
        method: 'ANY',
        handler: apiRouter.route,
        exactMatch: true,
        requireJWT: false, // Does not require a valid sessionToken
        sendUserInfo: false //Don't Send the user json with request
    },
    {
        path: '/api/',
        method: 'ANY',
        handler: apiRouter.route,
        exactMatch: false,
        requireJWT: true, // Requires a valid sessionToken for all sub-routes unless a more specific route overrides it.
        sendUserInfo: false //Don't Send the user json with request
    },
    {
        path: '/login',
        method: 'GET',
        handler: loginPage.display,
        exactMatch: true ,
        requireJWT: false, // Does not require a valid sessionToken
        sendUserInfo: false //Don't Send the user json with request
    }
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
        let user ='';

        // Find a matching route based on the request URL and method.
        for (const route of routes) {
            let isMatch = false;

            if (route.exactMatch) {
                // For exact matches, compare only the pathname part (ignoring query parameters)
                const url = new URL(req.url, `http://${req.headers.host}`);
                isMatch = url.pathname === route.path;
            } else {
                // Handle prefix matches for paths like /image/
                isMatch = urlPath.startsWith(route.path);
            }

            // If a match is found, execute its handler and stop processing.
            if (isMatch && method === route.method || isMatch && route.method==='ANY') {
                // If the route requires authentication, verify the JWT.
                if (route.requireJWT && config.disable_authentication === false) {
                    const cookies = parseCookies(req);
                    const token = cookies.sessionToken;

                    if (!token) {
                        // No token found, redirect to the login page.
                        res.writeHead(302, { 'Location': '/login' });
                        return res.end();
                    }

                    const decoded = await jwTokenServices.verifyJsonWebToken(token);

                    if (decoded.error) {
                        // Token is invalid or expired, redirect to login and clear the bad cookie.
                        console.log('JWT verification failed, redirecting to login:', decoded.message);
                        res.writeHead(302, {
                            'Location': '/login',
                            'Set-Cookie': 'sessionToken=; HttpOnly; Max-Age=0; Path=/'
                        });
                        return res.end();
                    }else{
                        //No error so lets build a user json
                        user = {
                            username: decoded.username,
                        };
                    }
                }

                // Check for enable configurations parameter (?ec) on dashboard routes
                if ((route.path === '/' || route.path === '/index.html') && method === 'GET') {
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const hasEnableConfig = url.searchParams.has('ec');
                    
                    if (hasEnableConfig) {
                        // Only allow ?ec parameter when authentication is enabled (more secure)
                        if (config.disable_authentication === false) {
                            console.log('Enable configurations parameter detected - re-enabling configurations');
                            
                            // Import configuration manager to update the setting
                            const configurationManager = require('../services/configurationManager');
                            
                            try {
                                // Read current config
                                const fs = require('fs').promises;
                                const path = require('path');
                                const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');
                                const configContent = await fs.readFile(configPath, 'utf8');
                                const currentConfig = JSON.parse(configContent);
                                
                                // Update disable_configurations to false
                                currentConfig.disable_configurations = false;
                                
                                // Write updated configuration
                                await fs.writeFile(configPath, JSON.stringify(currentConfig, null, 4), 'utf8');
                                
                                // Reload configuration in memory
                                await configurationManager.reloadConfig();
                                
                                console.log('Enable configurations applied - configurations re-enabled');
                                
                                // Redirect to clean URL (remove ?ec parameter)
                                const cleanUrl = `${url.pathname}`;
                                res.writeHead(302, { 'Location': cleanUrl });
                                return res.end();
                                
                            } catch (error) {
                                console.error('Error applying enable configurations:', error);
                                // Continue with normal page load if enable config fails
                            }
                        } else {
                            console.log('Enable configurations parameter ignored - authentication is disabled');
                            // Continue with normal page load when authentication is disabled
                        }
                    }
                }

                // Execute the matched route's handler function and send user json if required.
                if(route.sendUserInfo){
                    await route.handler(req, res, config, user);
                }else{
                    await route.handler(req, res, config);
                }
               
                return; // Exit after handling the request.
            }
        }

        // If no route matches after checking all possibilities, send a 404 Not Found response
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found - Router could not find the path');

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