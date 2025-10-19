/**
 * @file Crypto Node Service - Fetches blockchain node data via RPC
 * This service aggregates data from configured cryptocurrency nodes
 * using JSON-RPC calls defined in config.json and rpcConfig.json
 */

const rpcService = require('./rpcService');

/**
 * Fetches blockchain info from a crypto node
 * @param {string} nodeId - The node identifier from rpcConfig.json
 * @returns {Promise<object>} Blockchain information
 */
async function getBlockchainInfo(nodeId) {
    try {
        return await rpcService.callRPCService(nodeId, 'getblockchaininfo', []);
    } catch (error) {
        console.error(`Error fetching blockchain info for ${nodeId}:`, error.message);
        throw error;
    }
}

/**
 * Fetches network totals from a crypto node
 * @param {string} nodeId - The node identifier from rpcConfig.json
 * @returns {Promise<object>} Network totals information
 */
async function getNetworkTotals(nodeId) {
    try {
        return await rpcService.callRPCService(nodeId, 'getnettotals', []);
    } catch (error) {
        console.error(`Error fetching network totals for ${nodeId}:`, error.message);
        throw error;
    }
}

/**
 * Fetches wallet balance from a crypto node
 * @param {string} nodeId - The node identifier from rpcConfig.json
 * @returns {Promise<number>} Wallet balance
 */
async function getBalance(nodeId) {
    try {
        return await rpcService.callRPCService(nodeId, 'getbalance', []);
    } catch (error) {
        console.error(`Error fetching balance for ${nodeId}:`, error.message);
        throw error;
    }
}

/**
 * Fetches network info from a crypto node
 * @param {string} nodeId - The node identifier from rpcConfig.json
 * @returns {Promise<object>} Network information
 */
async function getNetworkInfo(nodeId) {
    try {
        return await rpcService.callRPCService(nodeId, 'getnetworkinfo', []);
    } catch (error) {
        console.error(`Error fetching network info for ${nodeId}:`, error.message);
        throw error;
    }
}

/**
 * Aggregates all crypto node data for a single node
 * @param {object} nodeConfig - Node configuration from config.json
 * @returns {Promise<object>} Aggregated node data with all RPC responses
 */
async function fetchCryptoNodeData(nodeConfig) {
    const nodeId = nodeConfig.NodeId;

    try {
        // Fetch all data concurrently
        const [blockchainInfo, networkTotals, balance, networkInfo] = await Promise.all([
            getBlockchainInfo(nodeId),
            getNetworkTotals(nodeId),
            getBalance(nodeId),
            getNetworkInfo(nodeId)
        ]);

        // Combine all data into a single object
        return {
            id: nodeConfig.NodeName || nodeId,
            nodeId: nodeId,
            nodeType: nodeConfig.NodeType,
            nodeAlgo: nodeConfig.NodeAlgo,
            status: 'online',
            blockchainInfo: blockchainInfo,
            networkTotals: networkTotals,
            balance: balance,
            networkInfo: networkInfo,
            displayFields: nodeConfig.NodeDisplayFields || []
        };
    } catch (error) {
        console.error(`Failed to fetch data for node ${nodeId}:`, error.message);

        // Return error object for this node
        return {
            id: nodeConfig.NodeName || nodeId,
            nodeId: nodeId,
            nodeType: nodeConfig.NodeType,
            status: 'Error',
            message: error.message
        };
    }
}

/**
 * Fetches data for all configured crypto nodes
 * @param {object} config - Application configuration
 * @returns {Promise<Array>} Array of crypto node data objects
 */
async function fetchAllCryptoNodes(config) {
    // Check if crypto nodes are enabled
    if (!config.cryptNodesEnabled || !config.cryptoNodes || !Array.isArray(config.cryptoNodes)) {
        return [];
    }

    // Parse the new configuration structure
    let nodes = [];
    let displayFields = [];

    // Find the Nodes and NodeDisplayFields in the cryptoNodes array
    config.cryptoNodes.forEach(item => {
        if (item.Nodes && Array.isArray(item.Nodes)) {
            nodes = item.Nodes;
        }
        if (item.NodeDisplayFields && Array.isArray(item.NodeDisplayFields)) {
            displayFields = item.NodeDisplayFields;
        }
    });

    // If nodes array is empty, return empty array
    if (nodes.length === 0) {
        return [];
    }

    // Add the common displayFields to each node configuration
    const nodeConfigsWithDisplayFields = nodes.map(node => ({
        ...node,
        NodeDisplayFields: displayFields
    }));

    // Fetch data for all nodes concurrently
    const nodePromises = nodeConfigsWithDisplayFields.map(nodeConfig =>
        fetchCryptoNodeData(nodeConfig)
    );

    return await Promise.all(nodePromises);
}

module.exports = {
    getBlockchainInfo,
    getNetworkTotals,
    getBalance,
    getNetworkInfo,
    fetchCryptoNodeData,
    fetchAllCryptoNodes
};
