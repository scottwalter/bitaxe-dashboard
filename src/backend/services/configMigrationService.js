/**
 * @file Configuration Migration Service
 *
 * This service handles migrating old config.json structures to new formats.
 * It runs on application startup to ensure backwards compatibility.
 *
 * Migrations handled:
 * - mining_core_url: string -> array of objects
 * - cryptoNodes: flat structure -> Nodes array + NodeDisplayFields
 *
 * @author Scott Walter
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'config.json');
const MIGRATION_STATUS_PATH = path.join(__dirname, '..', '..', 'config', '.migration_status.json');

/**
 * Checks if mining_core_url needs migration
 * @param {object} config - The configuration object
 * @returns {boolean} True if migration is needed
 */
function needsMiningCoreMigration(config) {
    if (!config.mining_core_url) {
        return false;
    }

    // If it's a string, it needs migration
    if (typeof config.mining_core_url === 'string') {
        return true;
    }

    // If it's an array, check if it's in the old format (no objects with key-value pairs)
    if (Array.isArray(config.mining_core_url)) {
        // Check if any element is not an object or is an empty object
        return config.mining_core_url.some(item =>
            typeof item !== 'object' || item === null || Object.keys(item).length === 0
        );
    }

    return false;
}

/**
 * Migrates mining_core_url from string to array format
 * @param {object} config - The configuration object
 * @returns {object} Migrated configuration
 */
function migrateMiningCoreUrl(config) {
    if (!needsMiningCoreMigration(config)) {
        return config;
    }

    console.log('Migrating mining_core_url to new array format...');

    // If it's a string, convert to array with single entry
    if (typeof config.mining_core_url === 'string') {
        config.mining_core_url = [
            { "Mining Core": config.mining_core_url }
        ];
        console.log('Converted string mining_core_url to array format');
    }

    return config;
}

/**
 * Checks if cryptoNodes needs migration
 * @param {object} config - The configuration object
 * @returns {boolean} True if migration is needed
 */
function needsCryptoNodesMigration(config) {
    if (!config.cryptoNodes || !Array.isArray(config.cryptoNodes)) {
        return false;
    }

    // Check if it's already in the new format
    const hasNodesArray = config.cryptoNodes.some(item => item.Nodes && Array.isArray(item.Nodes));
    const hasDisplayFields = config.cryptoNodes.some(item => item.NodeDisplayFields && Array.isArray(item.NodeDisplayFields));

    // If it already has both Nodes and NodeDisplayFields, it's in the new format
    if (hasNodesArray && hasDisplayFields) {
        return false;
    }

    // Check if any items have the old flat structure (NodeType, NodeName, etc.)
    const hasOldFormat = config.cryptoNodes.some(item =>
        item.NodeType || item.NodeName || item.NodeId || item.NodeAlgo
    );

    return hasOldFormat;
}

/**
 * Migrates cryptoNodes from old flat structure to new Nodes array format
 * @param {object} config - The configuration object
 * @returns {object} Migrated configuration
 */
function migrateCryptoNodes(config) {
    if (!needsCryptoNodesMigration(config)) {
        return config;
    }

    console.log('Migrating cryptoNodes to new structure...');

    const oldNodes = config.cryptoNodes;
    const nodes = [];
    let nodeDisplayFields = [];

    // Extract nodes and display fields from old structure
    oldNodes.forEach(item => {
        if (item.NodeType || item.NodeName || item.NodeId || item.NodeAlgo) {
            // This is a node definition
            const node = {
                NodeType: item.NodeType,
                NodeName: item.NodeName,
                NodeId: item.NodeId,
                NodeAlgo: item.NodeAlgo
            };
            nodes.push(node);

            // Save the NodeDisplayFields from the first node (they're all the same in old format)
            if (nodeDisplayFields.length === 0 && item.NodeDisplayFields) {
                nodeDisplayFields = item.NodeDisplayFields;
            }
        }
    });

    // Create new structure
    config.cryptoNodes = [
        {
            Nodes: nodes
        },
        {
            NodeDisplayFields: nodeDisplayFields
        }
    ];

    console.log(`Migrated ${nodes.length} crypto node(s) to new structure`);

    return config;
}

/**
 * Main migration function - checks and migrates config if needed
 * @returns {Promise<boolean>} True if migration was performed
 */
async function migrateConfig() {
    try {
        // Check if config file exists
        try {
            await fs.access(CONFIG_PATH);
        } catch (error) {
            // Config doesn't exist yet (probably first run)
            console.log('No config.json found - skipping migration');
            return false;
        }

        // Read current config
        const configContent = await fs.readFile(CONFIG_PATH, 'utf8');
        let config = JSON.parse(configContent);

        let migrationPerformed = false;
        const migrationsApplied = [];

        // Check and migrate mining_core_url
        if (needsMiningCoreMigration(config)) {
            config = migrateMiningCoreUrl(config);
            migrationPerformed = true;
            migrationsApplied.push('Mining Core URL structure updated to support multiple instances');
        }

        // Check and migrate cryptoNodes
        if (needsCryptoNodesMigration(config)) {
            config = migrateCryptoNodes(config);
            migrationPerformed = true;
            migrationsApplied.push('Crypto Nodes structure updated to new format with shared display fields');
        }

        // If any migration was performed, save the updated config and create status file
        if (migrationPerformed) {
            await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

            // Create migration status file for frontend notification
            const migrationStatus = {
                migrated: true,
                timestamp: new Date().toISOString(),
                migrations: migrationsApplied
            };
            await fs.writeFile(MIGRATION_STATUS_PATH, JSON.stringify(migrationStatus, null, 2), 'utf8');

            console.log('✓ Configuration migration completed successfully');
            return true;
        } else {
            console.log('✓ Configuration is up to date - no migration needed');
            return false;
        }

    } catch (error) {
        console.error('Error during configuration migration:', error);
        throw error;
    }
}

/**
 * Checks if migration status exists (migration was performed)
 * @returns {Promise<object|null>} Migration status or null if no migration
 */
async function getMigrationStatus() {
    try {
        const statusContent = await fs.readFile(MIGRATION_STATUS_PATH, 'utf8');
        return JSON.parse(statusContent);
    } catch (error) {
        // Status file doesn't exist
        return null;
    }
}

/**
 * Clears the migration status file after user has been notified
 * @returns {Promise<void>}
 */
async function clearMigrationStatus() {
    try {
        await fs.unlink(MIGRATION_STATUS_PATH);
        console.log('Migration status cleared');
    } catch (error) {
        // File doesn't exist, ignore
    }
}

module.exports = {
    migrateConfig,
    needsMiningCoreMigration,
    needsCryptoNodesMigration,
    migrateMiningCoreUrl,
    migrateCryptoNodes,
    getMigrationStatus,
    clearMigrationStatus
};
