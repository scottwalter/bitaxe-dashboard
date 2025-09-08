/**
 * @file This is the main entry point for the Bitaxe Dashboard application.
 * It initializes the server, loads the configuration, and starts listening for
 * incoming HTTP requests, which are then handed off to the dispatcher.
 * 
 */

const http = require('http');
const router = require('./backend/routers/router');
const configurationManager = require('./backend/services/configurationManager');

/** The default port to use for the web server if not specified elsewhere. */
const DEFAULT_WEB_SERVER_PORT = 3000;



/**
 * Initializes and starts the HTTP server.
 * This function loads the configuration, determines the correct port,
 * creates the server, and sets up request and error handling.
 */
async function startServer() {
    let config;
    try {
        config = await configurationManager.loadConfig();
    } catch (error) {
        console.error('Failed to load configuration:', error);
        process.exit(1);
    }

    // Determine port, prioritizing environment variable, then config, then the default.
    const port = process.env.PORT || config.web_server_port || DEFAULT_WEB_SERVER_PORT;

    const server = http.createServer(async (req, res) => {
        // Determine the client's real IP address, considering proxies.
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // If x-forwarded-for contains a list of IPs, the first one is the original client.
        if (clientIp && clientIp.includes(',')) {
            clientIp = clientIp.split(',')[0].trim();
        }
        console.log(`${new Date().toISOString()} - ${clientIp} - Request made to: ${req.url}`);
        
        // Get the current configuration for each request (allows for dynamic reloading)
        const currentConfig = configurationManager.getConfig();
        await router.route(req, res, currentConfig);
    });

    // Set up a listener for server-level errors, like a port being in use.
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`ERROR: Port ${port} is already in use.`);
            console.error('Please close the application using this port or choose a different port.');
        } else {
            console.error('SERVER ERROR:', error);
        }
        process.exit(1); // Exit on critical server errors.
    });

    try {
        // Wrap server.listen in a Promise to allow using async/await for startup.
        await new Promise((resolve, reject) => {
            server.listen(port, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        console.log(`Server running on http://localhost:${port}`);
        console.log(`Server started at: ${new Date().toISOString()}`);
    } catch (listenError) {
        console.error('FAILED TO START SERVER:', listenError);
        process.exit(1); // Exit if the server cannot start listening.
    }
}

// Start the application.
startServer();