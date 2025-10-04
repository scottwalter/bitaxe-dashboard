const http = require('http');
const fs = require('fs');
const path = require('path');

// Load RPC configuration on module initialization
const RPC_CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'rpcConfig.json');
let rpcConfig = null;

/**
 * Loads the RPC configuration from rpcConfig.json
 * @returns {Object} The parsed RPC configuration
 * @throws {Error} If the config file cannot be read or parsed
 */
function loadRPCConfig() {
    try {
        const configData = fs.readFileSync(RPC_CONFIG_PATH, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        throw new Error(`Failed to load RPC config from ${RPC_CONFIG_PATH}: ${error.message}`);
    }
}

/**
 * Gets RPC connection details for a specific node ID
 * @param {string} nodeId - The node identifier (e.g., 'dgb1')
 * @returns {Object} Connection details {rpcHost, rpcPort, rpcAuth}
 * @throws {Error} If the node ID is not found in rpcConfig.json
 */
function getRPCConnectionDetails(nodeId) {
    if (!rpcConfig) {
        rpcConfig = loadRPCConfig();
    }

    const node = rpcConfig.cryptoNodes.find(n => n.NodeId === nodeId);
    if (!node) {
        throw new Error(`Node ID '${nodeId}' not found in rpcConfig.json`);
    }

    return {
        rpcHost: node.NodeRPCAddress,
        rpcPort: node.NodeRPCPort,
        rpcAuth: node.NodeRPAuth
    };
}

/**
 * Makes an RPC call to a cryptocurrency node server.
 * @param {string|Object} nodeId - Either a nodeId string to lookup in rpcConfig.json
 * @param {string} method - The RPC method to call (e.g., 'getblocktemplate', 'submitblock')
 * @param {Array} [params=[]] - Array of parameters for the RPC method
 * @returns {Promise<any>} Promise that resolves with the RPC result or rejects with an error
 */
async function callRPCService(nodeId, method, params = []) {
    return new Promise((resolve, reject) => {
        let connectionDetails;
        try {
             connectionDetails = getRPCConnectionDetails(nodeId);
        } catch (error) {
                return reject(error);
        }
        
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            id: 'bitaxe-dashboard',
            method: method,
            params: params,
        });

        console.log(`[rpcService] Sending RPC request to ${connectionDetails.rpcHost}:${connectionDetails.rpcPort} - Method: ${method}`);

        const auth = 'Basic ' + Buffer.from(connectionDetails.rpcAuth).toString('base64');

        const options = {
            hostname: connectionDetails.rpcHost,
            port: connectionDetails.rpcPort,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': auth,
            },
        };

        const req = http.request(options, (res) => {
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                try {
                    if (!rawData) {
                        // The server closed the connection without sending data. This is often an auth failure.
                        throw new Error(`Empty response from RPC server. Check RPC credentials (rpcauth) and rpcallowip in node config. Status: ${res.statusCode}`);
                    }
                    const parsedData = JSON.parse(rawData);
                    if (parsedData.error) {
                        reject(parsedData.error);
                    } else {
                        resolve(parsedData.result);
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse RPC response: ${e.message} - ${rawData}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`RPC request error: ${e.message}`));
        });

        req.write(postData);
        req.end();
    });
}

module.exports = {
    callRPCService,
    getRPCConnectionDetails,
    loadRPCConfig
};