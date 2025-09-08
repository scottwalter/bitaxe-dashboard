/**
 * @file Main entry point for the Bitaxe Dashboard application.
 * 
 * This module provides the core HTTP server functionality with support for both
 * bootstrap mode (first-time setup) and normal operation mode. It handles
 * dynamic mode switching, configuration loading, and request routing.
 * 
 * @author Scott Walter
 * @version 2.0.0
 * @since 1.0.0
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const bootstrapRouter = require('./backend/bootStrap');

/** 
 * Default port number for the web server when no configuration is available.
 * @constant {number}
 * @default 3000
 */
const DEFAULT_WEB_SERVER_PORT = 3000;

/**
 * Checks if all required configuration files exist in the config directory.
 * 
 * This function is used to determine whether the application should start in
 * bootstrap mode (for first-time setup) or normal operation mode.
 * 
 * @async
 * @function checkConfigFilesExist
 * @returns {Promise<boolean>} Promise that resolves to true if all required config files exist
 * @throws {Error} Does not throw - returns false for any access errors
 */
async function checkConfigFilesExist() {
    const configDir = path.join(__dirname, 'config');
    const requiredFiles = ['config.json', 'access.json', 'jsonWebTokenKey.json'];
    
    try {
        for (const file of requiredFiles) {
            await fs.access(path.join(configDir, file));
        }
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Initializes and starts the HTTP server with support for dynamic mode switching.
 * 
 * This function handles the complete server initialization process including:
 * - Configuration file detection and loading
 * - Bootstrap vs normal mode determination
 * - Dynamic module loading based on mode
 * - HTTP server creation and request routing
 * - Error handling and graceful shutdown
 * 
 * @async
 * @function startServer
 * @returns {Promise<void>} Promise that resolves when server is successfully started
 * @throws {Error} Throws and exits process on critical startup failures
 */
async function startServer() {
    const configFilesExist = await checkConfigFilesExist();
    let config;
    let isBootstrapMode = false;
    let router = null;
    let configurationManager = null;
    
    if (!configFilesExist) {
        console.log('Configuration files missing. Starting in bootstrap mode...');
        isBootstrapMode = true;
        config = { web_server_port: DEFAULT_WEB_SERVER_PORT };
    } else {
        try {
            // Only require these modules if not in bootstrap mode
            router = require('./backend/routers/router');
            configurationManager = require('./backend/services/configurationManager');
            config = await configurationManager.loadConfig();
        } catch (error) {
            console.error('Failed to load configuration:', error);
            process.exit(1);
        }
    }

    /**
     * Switches the server from bootstrap mode to normal operation mode.
     * 
     * This inner function is called when the bootstrap process completes successfully.
     * It dynamically loads the required modules and configuration for normal operation.
     * 
     * @async
     * @function switchToNormalMode
     * @returns {Promise<void>} Promise that resolves when mode switch is complete
     * @throws {Error} Logs errors but does not throw to prevent server crash
     */
    async function switchToNormalMode() {
        try {
            console.log('Bootstrap complete. Switching to normal mode...');
            isBootstrapMode = false;
            
            // Load the required modules
            router = require('./backend/routers/router');
            configurationManager = require('./backend/services/configurationManager');
            config = await configurationManager.loadConfig();
            
            console.log('Successfully switched to normal mode. Application ready!');
        } catch (error) {
            console.error('Failed to switch to normal mode:', error);
        }
    }

    // Listen for bootstrap completion
    process.on('bootstrapComplete', switchToNormalMode);

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
        
        // Check if we're in bootstrap mode
        if (isBootstrapMode) {
            await bootstrapRouter.route(req, res);
        } else {
            // Get the current configuration for each request (allows for dynamic reloading)
            const currentConfig = configurationManager.getConfig();
            await router.route(req, res, currentConfig);
        }
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