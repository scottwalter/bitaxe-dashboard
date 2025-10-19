/**
 * @file Migration Status Controller
 *
 * Handles API requests for checking and clearing configuration migration status.
 *
 * @author Scott Walter
 * @version 1.0.0
 */

const configMigrationService = require('../services/configMigrationService');

/**
 * GET /api/migration/status
 * Returns the migration status if a migration was performed
 * @param {object} req - HTTP request object
 * @param {object} res - HTTP response object
 */
async function getMigrationStatus(req, res) {
    try {
        const status = await configMigrationService.getMigrationStatus();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: status
        }));
    } catch (error) {
        console.error('Error getting migration status:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Failed to get migration status'
        }));
    }
}

/**
 * POST /api/migration/clear
 * Clears the migration status after user has been notified
 * @param {object} req - HTTP request object
 * @param {object} res - HTTP response object
 */
async function clearMigrationStatus(req, res) {
    try {
        await configMigrationService.clearMigrationStatus();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Migration status cleared'
        }));
    } catch (error) {
        console.error('Error clearing migration status:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Failed to clear migration status'
        }));
    }
}

module.exports = {
    getMigrationStatus,
    clearMigrationStatus
};
