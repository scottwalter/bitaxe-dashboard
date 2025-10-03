const http = require('http');

/**
 * Makes an RPC call to the DigiByte Core server.
 * @param {Object} config - Configuration object containing RPC connection details
 * @param {string} config.rpcHost - RPC server hostname 
 * @param {number} config.rpcPort - RPC server port
 * @param {string} config.rpcAuth - RPC authentication credentials (user:pass format)
 * @param {string} method - The RPC method to call (e.g., 'getblocktemplate', 'submitblock')
 * @param {Array} [params=[]] - Array of parameters for the RPC method
 * @returns {Promise<any>} Promise that resolves with the RPC result or rejects with an error
 */
async function callRPCService(config, method, params = []) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            id: 'bitaxe-dashboard',
            method: method,
            params: params,
        });

        console.log(`Sending RPC payload for method '${method}':`, postData);

        const auth = 'Basic ' + Buffer.from(config.rpcAuth).toString('base64');

        const options = {
            hostname: config.rpcHost,
            port: config.rpcPort,
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
                        throw new Error(`Empty response from RPC server. Check RPC credentials (rpcauth) and rpcallowip in digibyte.conf. Status: ${res.statusCode}`);
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
            reject(new Error(`RPC request error to Digibyte Core: ${e.message}`));
        });

        req.write(postData);
        req.end();
    });
}
async function tester() {
    const rpcHost = '192.168.7.149'; 
    const rpcPort = 'x001'; 
    const rpcAuth = 'xx:xx'; 
    const config = {
        "rpcHost": rpcHost,
        "rpcPort": rpcPort,
        "rpcAuth": rpcAuth,
    }
    
    const testCalls = [
        { method: 'getblockchaininfo', params: [] },
        { method: 'getnetworkinfo', params: [] },
        { method: 'getmininginfo', params: [] },
        { method: 'getblockcount', params: [] },
        { method: 'getbestblockhash', params: [] },
        { method: 'getconnectioncount', params: [] },
        { method: 'getmempoolinfo', params: [] },
        { method: 'getdifficulty', params: [] },
        { method: 'getnettotals', params: [] },
        { method: 'getrawmempool', params: [] },
        { method: 'getbalance', params: [] },
        
        
        
    ];
    
    for (const call of testCalls) {
        try {
            console.log(`\n--- Testing ${call.method} ---`);
            const result = await callRPCService(config, call.method, call.params);
            console.log(`RESPONSE: ${JSON.stringify(result, null, 2)}`);
            //console.log('Result:', result);
        } catch (error) {
            console.error(`Error calling ${call.method}:`, error.message);
        }
    }
}
// Handle command line execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const functionName = args[0];
    
    if (functionName === 'tester') {
        tester().then(result => {
            //console.log('Final result:', result);
        }).catch(error => {
            console.error('Error:', error);
        });
    } else {
        console.log('Available functions: tester');
        console.log('Usage: node rpcService.js tester');
    }
}
module.exports = {
    callRPCService,
    tester
};