/**
 * @file Configuration Manager - Handles dynamic loading and reloading of configuration
 * without requiring server restarts. Provides a centralized way to access and update
 * the application configuration.
 */

const fs = require('fs').promises;
const path = require('path');

/** The full, absolute path to the configuration file. */
const CONFIG_FILE_PATH = path.join(__dirname, '..', '..', 'config', 'config.json');

/**
 * Configuration Manager class - manages configuration loading, reloading, and access
 */
class ConfigurationManager {
    constructor() {
        this.config = null;
        this.listeners = new Set();
    }

    /**
     * Loads the configuration from the file system and processes it.
     * @returns {Promise<object>} The loaded and processed configuration object.
     */
    async loadConfig() {
        try {
            console.log(`Loading configuration from: ${CONFIG_FILE_PATH}`);
            const data = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
            const config = JSON.parse(data);
            
            // Set the configuration_outdated to false, initial value
            config.configuration_outdated = false;

            // Ensure disable_authentication has a default value if not present
            if (!config.hasOwnProperty('disable_authentication')) {
                console.log('"disable_authentication" not found in config, defaulting to true (authentication disabled).');
                config.disable_authentication = true;
                config.configuration_outdated = true;
            }
            
            // Ensure disable_settings has a default value if not present
            if (!config.hasOwnProperty('disable_settings')) {
                console.log('"disable_settings" not found in config, defaulting to true (settings disabled).');
                config.disable_settings = true;
                config.configuration_outdated = true;
            }
            
            // Ensure disable_configurations has a default value if not present
            if (!config.hasOwnProperty('disable_configurations')) {
                console.log('"disable_configurations" not found in config, defaulting to true (configurations disabled).');
                config.disable_configurations = true;
                config.configuration_outdated = true;
            }

            // Handle demo mode configuration
            if (config.demo_mode === true) {
                config.mining_core_url = `http://127.0.0.1:${config.web_server_port}`;
                config.title += ' - DEMO MODE';
                const newEntry1 = {"DemoAxe1": `http://127.0.0.1:${config.web_server_port}`};
                const newEntry2 = {"DemoAxe2": `http://127.0.1.1:${config.web_server_port}`};
                config.bitaxe_instances = [newEntry1, newEntry2];
            }

            this.config = config;
            console.log('Configuration loaded successfully');
            
            // Notify all listeners of the configuration change
            this.notifyListeners(config);
            
            return config;
        } catch (error) {
            console.error('Error loading configuration:', error);
            throw error;
        }
    }

    /**
     * Reloads the configuration from the file system.
     * @returns {Promise<object>} The reloaded configuration object.
     */
    async reloadConfig() {
        console.log('Reloading configuration...');
        return await this.loadConfig();
    }

    /**
     * Gets the current configuration object.
     * @returns {object|null} The current configuration or null if not loaded.
     */
    getConfig() {
        return this.config;
    }

    /**
     * Adds a listener function that will be called whenever the configuration is reloaded.
     * @param {Function} listener - Function to call when config changes.
     */
    addListener(listener) {
        this.listeners.add(listener);
    }

    /**
     * Removes a configuration change listener.
     * @param {Function} listener - The listener function to remove.
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }

    /**
     * Notifies all listeners of a configuration change.
     * @param {object} newConfig - The new configuration object.
     */
    notifyListeners(newConfig) {
        this.listeners.forEach(listener => {
            try {
                listener(newConfig);
            } catch (error) {
                console.error('Error in configuration change listener:', error);
            }
        });
    }
}

// Create and export a singleton instance
const configurationManager = new ConfigurationManager();

module.exports = configurationManager;