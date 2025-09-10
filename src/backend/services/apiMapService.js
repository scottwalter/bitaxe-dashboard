/**
 * @file This module provides a centralized service for mapping logical API endpoint names
 * to their actual URL paths. It abstracts the API routes, allowing for easy updates
 * and a separation of concerns. It also handles redirecting API calls to mock endpoints
 * when the application is running in demo mode.
 */

/**
 * A map of internal, abstract API endpoint names to their concrete URL paths.
 * This allows other modules to request an API path by a logical name (e.g., 'instanceInfo')
 * without needing to know the exact URL, which might change.
 * @const {Object<string, string>}
 */
const apiEndpointMap = {
    'instanceInfo': '/api/system/info',
    'pools': '/api/pools',
    'instanceRestart': '/api/system/restart',
    'instanceSettings': '/api/system',
    'statisticsDashboard': '/api/system/statistics/dashboard',
};

/**
 * The URL prefix to prepend to API paths when the application is in demo mode.
 * This redirects API calls to the mock demo API router.
 * @const {string}
 */
const demoPrefixPath = '/demo';

/**
 * Retrieves the correct API path for a given logical endpoint name,
 * automatically prepending a demo prefix if the application is in demo mode.
 * This function centralizes API path logic, making the application more maintainable.
 *
 * @param {object} config The application's global configuration object.
 * @param {boolean} config.demo_mode - A flag indicating if the application is in demo mode.
 * @param {string} endpoint The logical name of the endpoint (e.g., 'instanceInfo', 'pools'). This must be a key in `apiEndpointMap`.
 * @returns {Promise<string>} A promise that resolves to the full, correct API path.
 * @throws {Error} If the `config` or `endpoint` parameters are missing, or if the `endpoint` key is not found.
 */
async function getApiPath(config, endpoint) {
    try {
        if (!config) {
            throw new Error("Configuration object is required.");
        }
        if (!endpoint) {
            throw new Error("Endpoint key is required.");
        }

        const endPointPath = apiEndpointMap[endpoint];

        if (endPointPath === undefined) {
            throw new Error(`Endpoint key '${endpoint}' not found in API map.`);
        }

        if (config.demo_mode === true) {
            return demoPrefixPath + endPointPath;
        }

        return endPointPath;
    } catch (error) {
        console.error(`Error in getApiPath: ${error.message}`);
        // Re-throw to allow the caller to handle the failure.
        throw error;
    }
}

module.exports = {
    getApiPath
};