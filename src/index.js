/**
 * @file This is the main entry point for the Bitaxe Dashboard application.
 * It initializes the server, loads the configuration, and starts listening for
 * incoming HTTP requests, which are then handed off to the dispatcher.
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const router = require('./backend/routers/router');

/** The name of the configuration file. */
const CONFIG_FILE_NAME = 'config.json';
/** The directory where the configuration file is located, relative to the current module. */
const CONFIG_DIR = './config';
/** The default port to use for the web server if not specified elsewhere. */
const DEFAULT_WEB_SERVER_PORT = 3000;

/** The full, absolute path to the configuration file. */
const CONFIG_PATH = path.join(__dirname, CONFIG_DIR, CONFIG_FILE_NAME);


/**
 * Loads and parses the configuration file. If demo mode is enabled, it modifies
 * the configuration to use local demo endpoints.
 * @returns {Promise<object>} The parsed configuration object.
 * @throws {Error} If the file cannot be read or parsed, the process will exit.
 */
async function loadConfig() {
    try {
        console.log(`Attempting to load configuration from: ${CONFIG_PATH}`);
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        const config = JSON.parse(data);
        //Set the configuration_outdated to false, initial value
        config.configuration_outdated=false;

        // Ensure disable_authentication has a default value if not present.
        if (!config.hasOwnProperty('disable_authentication')) {
            console.log('"disable_authentication" not found in config, defaulting to true (authentication disabled).');
            config.disable_authentication = true;
            //Flag the config file as being outdated
            config.configuration_outdated=true;
        }
        // Ensure disable_settings has a default value if not present.
        if (!config.hasOwnProperty('disable_settings')) {
            console.log('"disable_settings" not found in config, defaulting to true (settings disabled).');
            config.disable_settings = true;
            //Flag the config file as being outdated.
            config.configuration_outdated=true;
        }

        if(config.demo_mode === true){
            // In demo mode, override URLs to point to the local server's demo API endpoints.
            config.mining_core_url = `http://127.0.0.1:${config.web_server_port}`;
            // Append a notice to the title to make it clear we are in demo mode.
            config.title += ' - DEMO MODE';
            // Replace the configured Bitaxe instances with mock demo instances.
            const newEntry1 =  {"DemoAxe1":"http://127.0.0.1:"+config.web_server_port};
            const newEntry2 =  {"DemoAxe2":"http://127.0.1.1:"+config.web_server_port};
            //const newEntry2 =  {"DemoAxe2":"http://127.0.2.2"}; // Pointing to non-routable address to simulate offline device.
            config.bitaxe_instances = [newEntry1, newEntry2];
        }
        console.log(`Configuration loaded successfully.`);
       //Uncomment for debugging: console.log(`Loaded Configuration: ${JSON.stringify(config, null, 2)}`);
        return config;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`ERROR: Configuration file not found at ${CONFIG_PATH}. Please ensure the file exists.`);
        } else if (error instanceof SyntaxError) {
            console.error(`ERROR: Failed to parse configuration file '${CONFIG_FILE_NAME}'. Please check for JSON syntax errors.`);
            console.error(`Parsing error details: ${error.message}`);
        } else {
            console.error(`An unexpected error occurred while loading '${CONFIG_FILE_NAME}':`, error);
        }
        // A missing or invalid configuration is a fatal error, so exit the process.
        process.exit(1);
    }
}

/**
 * Initializes and starts the HTTP server.
 * This function loads the configuration, determines the correct port,
 * creates the server, and sets up request and error handling.
 */
async function startServer() {
    let config;
    try {
        config = await loadConfig();
    } catch (error) {
        // loadConfig already handles logging and exiting, so we just re-throw to stop execution.
        throw error;
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
        
        // Pass the request to the router, which handles routing and response.
        await router.route(req, res, config);
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