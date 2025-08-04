const http = require('http');
const fs = require('fs').promises; // Use the promise-based fs module
const path = require('path');
const d = require('./controller/dispatcher');

// --- Constants for better maintainability ---
const CONFIG_FILE_NAME = 'config.json';
const CONFIG_DIR = './config';
const DEFAULT_WEB_SERVER_PORT = 3000; // Fallback port

const CONFIG_PATH = path.join(__dirname, CONFIG_DIR, CONFIG_FILE_NAME);

/**
 * Loads the configuration file.
 * @returns {Promise<object>} The parsed configuration object.
 * @throws {Error} If the file cannot be read or parsed.
 */
async function loadConfig() {
    try {
        console.log(`Attempting to load configuration from: ${CONFIG_PATH}`);
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        const config = JSON.parse(data);
        console.log(`Configuration loaded successfully.`);
        // console.log(`Loaded Configuration: ${JSON.stringify(config, null, 2)}`); // Uncomment for detailed config log
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
        // It's a critical error if config cannot be loaded, so exit.
        process.exit(1);
    }
}

/**
 * Starts the HTTP server.
 */
async function startServer() {
    let config;
    try {
        config = await loadConfig(); // Await config loading
    } catch (error) {
        // loadConfig already handles logging and exiting, so just re-throw if needed for specific cases
        throw error;
    }

    // Prioritize environment variable, then config, then default
    const port = process.env.PORT || config.web_server_port || DEFAULT_WEB_SERVER_PORT;

    const server = http.createServer(async (req, res) => {
        console.log(`${new Date().toISOString()} Request made to: ${req.url}`);
        // Ensure that d.dispatch is awaited. It handles sending the response.
        await d.dispatch(req, res, config);
    });

    // Handle server-specific errors, e.g., port already in use
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`ERROR: Port ${port} is already in use.`);
            console.error('Please close the application using this port or choose a different port.');
        } else {
            console.error('SERVER ERROR:', error);
        }
        process.exit(1); // Exit on critical server errors
    });

    // Start listening for requests
    try {
        // Wrap server.listen in a Promise to use async/await
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
        process.exit(1); // Exit if the server fails to listen
    }
}

// Execute the server startup function
startServer();