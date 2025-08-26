/**
 * @file this module is used to map API endpoints for all modules that need to make API calls to external rest APIs (or demo for demo mode)
 */
const apiEndpointMap = {
    'instanceInfo': '/api/system/info',
    'pools': '/api/pools',
    'instanceRestart': '/api/system/restart',
};
const demoPrefixPath = '/demo'; //prefix path for demo mode

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