/**
 * @file Bootstrap Service - Initial configuration setup with device validation.
 * 
 * This service module handles the creation of initial configuration files during
 * first-time application setup. It processes bootstrap form data, validates
 * device connectivity by testing HTTP endpoints, and creates the required
 * configuration files from templates.
 * 
 * Key features:
 * - Device URL validation with HTTP connectivity tests
 * - Mining Core API endpoint validation
 * - Template-based configuration file generation
 * - Password hashing and JWT key generation
 * - Comprehensive error handling and reporting
 * 
 * @author Scott Walter
 * @version 2.0.0
 * @since 2.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

/**
 * Path to the configuration directory where files will be created.
 * @constant {string}
 */
const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');

/**
 * Path to the JSON template directory containing configuration templates.
 * @constant {string}
 */
const TEMPLATE_DIR = path.join(__dirname, '..', 'jsonTemplate');

/**
 * Generates a cryptographically random 32-character alphanumeric string.
 * 
 * Used for creating JWT secret keys and random passwords when authentication
 * is disabled during bootstrap setup.
 * 
 * @function generateJWTKey
 * @returns {string} A 32-character random string containing letters and numbers
 * @since 2.0.0
 */
function generateJWTKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Hashes a password using SHA256 algorithm.
 * 
 * Creates a secure SHA256 hash of the provided plaintext password for
 * storage in the access.json configuration file.
 * 
 * @function hashPassword
 * @param {string} password - The plaintext password to hash
 * @returns {string} The SHA256 hash as a hexadecimal string
 * @since 1.0.0
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Ensures the config directory exists
 */
async function ensureConfigDir() {
    try {
        await fs.access(CONFIG_DIR);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(CONFIG_DIR, { recursive: true });
        } else {
            throw error;
        }
    }
}

/**
 * Creates config.json from template and form data
 * @param {object} formData - The form data from the bootstrap page
 */
async function createConfigFile(formData) {
    const templatePath = path.join(TEMPLATE_DIR, 'config.template.json');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const template = JSON.parse(templateContent);

    // Replace template values with form data
    template.title = formData.title || 'Bitaxe Dashboard';
    template.web_server_port = parseInt(formData.port) || 3000;
    template.disable_authentication = formData.enableAuth !== 'true';
    template.mining_core_enabled = formData.enableMiningCore === 'true';
    
    if (formData.enableMiningCore === 'true') {
        template.mining_core_url = formData.miningCoreUrl || 'http://192.168.1.100:4000';
    }

    // Handle bitaxe instances - start with empty array and add user instances
    template.bitaxe_instances = [];
    
    // Parse bitaxe instances from form data
    if (formData.bitaxeInstances && Array.isArray(formData.bitaxeInstances)) {
        formData.bitaxeInstances.forEach((instance, index) => {
            if (instance.name && instance.url) {
                const instanceObj = {};
                instanceObj[instance.name] = instance.url;
                template.bitaxe_instances.push(instanceObj);
            }
        });
    }

    // If no instances were provided, add a default one
    if (template.bitaxe_instances.length === 0) {
        template.bitaxe_instances.push({ "Bitaxe1": "http://192.168.1.100" });
    }

    const configPath = path.join(CONFIG_DIR, 'config.json');
    await fs.writeFile(configPath, JSON.stringify(template, null, 2));
}

/**
 * Creates access.json from template and form data
 * @param {object} formData - The form data from the bootstrap page
 */
async function createAccessFile(formData) {
    const templatePath = path.join(TEMPLATE_DIR, 'access.template.json');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    
    const username = formData.username || 'admin';
    let password = formData.password;
    
    // If authentication is disabled and no password provided, generate a random one
    if (formData.enableAuth !== 'true' && !password) {
        password = generateJWTKey(); // Reuse the JWT key generation for random password
        console.log('Authentication disabled - generated random password for access.json file');
    }
    
    if (!password) {
        throw new Error('Password is required');
    }

    const hashedPassword = hashPassword(password);
    
    // Create access object
    const accessObj = {};
    accessObj[username] = hashedPassword;

    const accessPath = path.join(CONFIG_DIR, 'access.json');
    await fs.writeFile(accessPath, JSON.stringify(accessObj, null, 2));
}

/**
 * Creates jsonWebTokenKey.json from template and form data
 * @param {object} formData - The form data from the bootstrap page
 */
async function createJWTFile(formData) {
    const templatePath = path.join(TEMPLATE_DIR, 'jsonWebTokenKey.template.json');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const template = JSON.parse(templateContent);

    // Use provided JWT key or generate a new one
    template.jsonWebTokenKey = formData.jwtKey || generateJWTKey();
    template.expiresIn = formData.jwtExpiry || '1h';

    const jwtPath = path.join(CONFIG_DIR, 'jsonWebTokenKey.json');
    await fs.writeFile(jwtPath, JSON.stringify(template, null, 2));
}

/**
 * Validates a URL by making an HTTP request to a specific endpoint
 * @param {string} url - The URL to test
 * @param {string} endpoint - The endpoint to test (e.g., '/api/system/info')
 * @returns {Promise<object>} Validation result with success and optional error message
 */
async function validateUrl(url, endpoint) {
    return new Promise((resolve) => {
        try {
            console.log(`Validating URL: ${url} with endpoint: ${endpoint}`);
            const fullUrl = url.endsWith('/') ? url.slice(0, -1) + endpoint : url + endpoint;
            console.log(`Full URL: ${fullUrl}`);
            const urlObj = new URL(fullUrl);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                timeout: 5000,
                headers: {
                    'User-Agent': 'Bitaxe-Dashboard-Bootstrap'
                }
            };

            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        JSON.parse(data); // Validate it's JSON
                        resolve({ success: true });
                    } catch (e) {
                        resolve({ success: false, error: 'Invalid JSON response' });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({ success: false, error: error.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, error: 'Connection timeout' });
            });

            req.end();
        } catch (error) {
            resolve({ success: false, error: 'Invalid URL format' });
        }
    });
}

/**
 * Validates all Bitaxe device URLs
 * @param {Array} bitaxeInstances - Array of bitaxe device objects
 * @returns {Promise<object>} Validation result
 */
async function validateBitaxeDevices(bitaxeInstances) {
    for (const instance of bitaxeInstances) {
        let deviceName, deviceUrl;
        
        // Handle both old format { "DeviceName": "url" } and new format { name: "name", url: "url" }
        if (instance.name && instance.url) {
            // New format from bootstrap form
            deviceName = instance.name;
            deviceUrl = instance.url;
        } else {
            // Old format for backwards compatibility
            deviceName = Object.keys(instance)[0];
            deviceUrl = instance[deviceName];
        }
        
        console.log(`Validating Bitaxe device: ${deviceName} at ${deviceUrl}`);
        
        const validation = await validateUrl(deviceUrl, '/api/system/info');
        if (!validation.success) {
            return {
                success: false,
                error: `Bitaxe device "${deviceName}" at ${deviceUrl} failed validation: ${validation.error}`
            };
        }
    }
    return { success: true };
}

/**
 * Validates Mining Core URL
 * @param {string} miningCoreUrl - The mining core URL to validate
 * @returns {Promise<object>} Validation result
 */
async function validateMiningCoreUrl(miningCoreUrl) {
    const validation = await validateUrl(miningCoreUrl, '/api/pools');
    if (!validation.success) {
        return {
            success: false,
            error: `Mining Core at ${miningCoreUrl} failed validation: ${validation.error}`
        };
    }
    return { success: true };
}

/**
 * Main function to create all configuration files
 * @param {object} formData - The form data from the bootstrap page
 * @returns {object} Success/error result
 */
async function createConfigFiles(formData) {
    try {
        // Validate Bitaxe devices
        if (formData.bitaxeInstances && formData.bitaxeInstances.length > 0) {
            const bitaxeValidation = await validateBitaxeDevices(formData.bitaxeInstances);
            if (!bitaxeValidation.success) {
                return bitaxeValidation;
            }
        }

        // Validate Mining Core URL if enabled
        if (formData.enableMiningCore === 'true' && formData.miningCoreUrl) {
            const miningCoreValidation = await validateMiningCoreUrl(formData.miningCoreUrl);
            if (!miningCoreValidation.success) {
                return miningCoreValidation;
            }
        }

        // Ensure config directory exists
        await ensureConfigDir();

        // Create all config files
        await createConfigFile(formData);
        await createAccessFile(formData);
        await createJWTFile(formData);

        console.log('Bootstrap configuration files created successfully');
        
        // Signal the main process that bootstrap is complete
        process.emit('bootstrapComplete');
        
        return { success: true };

    } catch (error) {
        console.error('Error creating config files:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generates a suggested JWT key for the form
 * @returns {string} A 32-character alphanumeric string
 */
function getSuggestedJWTKey() {
    return generateJWTKey();
}

module.exports = {
    createConfigFiles,
    getSuggestedJWTKey
};