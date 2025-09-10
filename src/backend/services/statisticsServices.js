/**
 * @file Statistics Services for BitAxe Dashboard
 * Provides real-time statistics data for individual miners by proxying requests
 * to their /api/system/statistics/dashboard endpoints.
 */

const apiMapService = require('./apiMapService');

/**
 * Routes and handles statistics requests for specific miner instances
 * @param {import('http').IncomingMessage} req The HTTP request object
 * @param {import('http').ServerResponse} res The HTTP response object  
 * @param {object} config The application configuration
 */
async function route(req, res, config) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const instanceId = url.searchParams.get('instanceId');
    
    if (!instanceId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            message: 'instanceId parameter is required' 
        }));
        return;
    }

    // Find the instance configuration
    const bitaxeInstances = config.bitaxe_instances || [];
    const instanceConfig = bitaxeInstances.find(instance => {
        const instanceName = Object.keys(instance)[0];
        return instanceName === instanceId;
    });

    if (!instanceConfig) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            message: `Instance '${instanceId}' not found in configuration` 
        }));
        return;
    }

    const instanceName = Object.keys(instanceConfig)[0];
    const instanceUrl = instanceConfig[instanceName];

    try {
        // Get the statistics endpoint path from apiMapService
        const statisticsPath = await apiMapService.getApiPath(config, 'statisticsDashboard');
        const statisticsUrl = `${instanceUrl}${statisticsPath}`;
        
        // Use dynamic import for node-fetch 3.x compatibility
        const { default: fetch } = await import('node-fetch');
        
        const response = await fetch(statisticsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const statisticsData = await response.json();
        
        // Add metadata about the instance
        const enrichedData = {
            success: true,
            instanceId: instanceId,
            instanceUrl: instanceUrl,
            data: statisticsData
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(enrichedData));

    } catch (error) {
        console.error(`Failed to fetch statistics for ${instanceId}:`, error);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: `Failed to fetch statistics from ${instanceId}: ${error.message}`,
            instanceId: instanceId
        }));
    }
}

module.exports = {
    route
};