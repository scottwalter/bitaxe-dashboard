//This will be the controller to call Bitaxe APIs via a proxy since they are on internal IP addresses.
//We will use the openai.yaml provided in the bitaxe.org github repo as the template to understand how to call the APIs

const fetch = require('node-fetch');
//Will pass the config JSON object to the functions when called.

async function restartBitaxe(instanceName, config) {
  const instance = config.bitaxe_instances.find(item => item[instanceName]);

    if (!instance) {
        throw new Error(`Bitaxe instance "${instanceName}" not found in configuration.`);
    }

    const baseUrl = instance[instanceName];
    const restartUrl = `${baseUrl}/api/system/restart`;

    try {
        const response = await fetch(restartUrl, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}, Body: ${await response.text()}`);
        }
        return { status: 'success', message: `Restart initiated for ${instanceName}` };
    } catch (error) {
        console.error("Failed to restart Bitaxe:", error);
        throw error;
    }
}

module.exports = {
    restartBitaxe
};