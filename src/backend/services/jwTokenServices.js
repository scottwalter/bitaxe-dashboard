/**
 * @file This module provides services for creating and verifying JSON Web Tokens (JWTs).
 * It is a core component of the application's authentication system, used to manage
 * secure session tokens.
 */
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// --- Module Initialization: Load JWT Configuration ---

let secretKey;
let expiresIn;

/**
 * Synchronously loads the JWT secret key and expiration settings from a configuration file on startup.
 * This is a "fail-fast" operation; if the key file is missing, unreadable, or malformed,
 * the application will log a fatal error and exit, as it cannot function securely without these settings.
 */
try {
    const keyFilePath = path.join(__dirname, '..', '..','config', 'jsonWebTokenKey.json');
    const keyFileContent = fs.readFileSync(keyFilePath, 'utf8');
    const keyData = JSON.parse(keyFileContent);
    secretKey = keyData.jsonWebTokenKey;
    expiresIn = keyData.expiresIn;

    if (!secretKey || !expiresIn) {
        throw new Error('"jsonWebTokenKey" or "expiresIn" key not found in jsonWebTokenKey.json');
    }
} catch (error) {
    console.error(`FATAL: Could not load JWT secret key from jsonWebTokenKey.json. Authentication will not work.`);
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit because the application cannot function securely without a key.
}

/**
 * Creates a signed JSON Web Token.
 *
 * @param {object} payload The data to embed within the token (e.g., user ID, username).
 * @returns {Promise<string|object>} A promise that resolves to the JWT string on success,
 * or an object with error details on failure.
 */
async function createJsonWebToken(payload){
    try {
        // Define options for the token (e.g., expiration time)
        const options = {
          expiresIn: expiresIn
        };
        // Create the JWT
        const token = jwt.sign(payload, secretKey, options);
        return token;
    } catch (error) {
        console.error('JWT Creation Error:', error.message);
        return { error: true, message: error.message };
    }
}

/**
 * Verifies the signature and expiration of a JSON Web Token.
 *
 * @param {string} token The JWT string to verify.
 * @returns {Promise<object>} A promise that resolves to the decoded payload if the token is valid,
 * or an object with error details if verification fails (e.g., invalid signature, expired token).
 */
async function verifyJsonWebToken(token){
    try {
        const decoded = jwt.verify(token, secretKey);
        return decoded;
    } catch (error) {
        // Catches errors like JsonWebTokenError (bad signature) or TokenExpiredError.
        console.error('JWT Verification Error:', error.message);
        return { error: true, message: error.message };
    }
}

/**
 * A test utility function to demonstrate token verification.
 * It creates a test token and then immediately tries to verify it.
 * @returns {Promise<object>} The decoded payload of the test token.
 */
async function testVerify(){
    const token = await testCreate(); // create test token to decode
    const decoded = await verifyJsonWebToken(token);
    console.log('Decoded Payload:', decoded);
    return decoded;
}

/**
 * A test utility function to demonstrate token creation.
 * It generates a token with a sample payload.
 * @returns {Promise<string>} The generated JWT string.
 */
async function testCreate(){
    const payload = {
      userId: 'user123',
      username: 'exampleuser',
      role: 'admin'
    };
    const token = await createJsonWebToken(payload);
    console.log(token);
    return token;
}

/**
 * Exports the core JWT service functions for use in other modules.
 */
module.exports = {
    createJsonWebToken,
    verifyJsonWebToken,
    testCreate,
    testVerify
}