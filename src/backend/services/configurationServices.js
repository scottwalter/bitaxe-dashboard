/**
 * @file This module acts as a controller for managing application configuration.
 * It allows reading and updating the config.json file through API endpoints.
 */

const http = require('http'); // Used for JSDoc type definitions (req, res).
const fs = require('fs').promises;
const path = require('path');
const configurationManager = require('./configurationManager');

const CONFIG_FILE_PATH = path.join(__dirname, '..', '..', 'config', 'config.json');

/**
 * Handles GET requests to retrieve the current configuration.
 *
 * @param {http.IncomingMessage} req The HTTP request object.
 * @param {http.ServerResponse} res The HTTP response object.
 * @param {object} config The application's configuration object.
 * @returns {Promise<object>} A promise that resolves to the configuration data.
 */
async function getConfiguration(req, res, config) {
    try {
        // Return the current configuration from the configuration manager
        const currentConfig = configurationManager.getConfig();
        return { status: 'success', data: currentConfig };
    } catch (error) {
        console.error("Failed to get configuration:", error);
        throw error;
    }
}

/**
 * Handles PATCH requests to update configuration settings. It reads the
 * settings payload from the request body and updates the config.json file.
 *
 * @param {http.IncomingMessage} req The HTTP request object, containing the JSON payload.
 * @param {http.ServerResponse} res The HTTP response object.
 * @param {object} config The application's configuration object.
 * @returns {Promise<object>} A promise that resolves to an object indicating success.
 * @throws {Error} If the request body is empty, invalid JSON, or if the file operation fails.
 */
async function updateConfiguration(req, res, config) {
    try {
        // Read the request body
        const body = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk) => {
                data += chunk.toString();
            });
            req.on('end', () => {
                resolve(data);
            });
            req.on('error', err => reject(err));
        });

        // Validate and parse the JSON payload
        if (!body || body.trim() === '') {
            throw new Error('Request body is empty. Please provide configuration settings to update.');
        }

        let updates;
        try {
            updates = JSON.parse(body);
        } catch (jsonError) {
            throw new Error(`Invalid JSON in request body: ${jsonError.message}`);
        }

        // Read current config from file to ensure we have the latest version
        let currentConfig;
        try {
            const configContent = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
            currentConfig = JSON.parse(configContent);
        } catch (error) {
            throw new Error(`Failed to read configuration file: ${error.message}`);
        }

        // Update the configuration with the new values
        const updatedConfig = { ...currentConfig, ...updates };

        // Validate critical fields exist
        if (!updatedConfig.bitaxe_dashboard_version) {
            updatedConfig.bitaxe_dashboard_version = currentConfig.bitaxe_dashboard_version || 2.0;
        }

        // Write updated configuration back to file
        try {
            await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(updatedConfig, null, 4), 'utf8');
            
            // Reload the configuration in memory - no server restart needed!
            await configurationManager.reloadConfig();
            
        } catch (error) {
            throw new Error(`Failed to write configuration file: ${error.message}`);
        }

        return { 
            status: 'success', 
            message: 'Configuration updated successfully! Changes have been applied immediately.',
            data: updatedConfig
        };
    } catch (error) {
        console.error("Failed to update configuration:", error);
        throw error;
    }
}

/**
 * Routes configuration-related requests to the appropriate handler.
 * 
 * @param {http.IncomingMessage} req The HTTP request object.
 * @param {http.ServerResponse} res The HTTP response object.
 * @param {object} config The application's configuration object.
 */
async function route(req, res, config) {
    // First, check if configurations are disabled in the configuration.
    if(config.disable_configurations === true){
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Configurations are disabled by configuration.' }));
        return;
    }
    
    try {
        const method = req.method;
        let result;

        switch (method) {
            case 'GET':
                result = await getConfiguration(req, res, config);
                break;
            case 'PATCH':
                result = await updateConfiguration(req, res, config);
                break;
            default:
                res.writeHead(405, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: `Method ${method} not allowed` }));
                return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
    } catch (error) {
        console.error(`Error in configuration controller (${req.method} ${req.url}):`, error);
        
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: 'error', 
                message: error.message || 'Internal server error' 
            }));
        }
    }
}

module.exports = {
    route,
    getConfiguration,
    updateConfiguration
};