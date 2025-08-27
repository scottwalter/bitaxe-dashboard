/**
 * @file This module handles user authentication for the application. It provides the logic
 * for the `/api/login` endpoint, validating user credentials against a stored access file
 * and issuing a JSON Web Token (JWT) upon a successful login.
 */

const fs = require('fs').promises;
const path = require('path');
const jwTokenServices = require('./jwTokenServices');

/**
 * Handles a POST request to the `/api/login` endpoint. It expects a JSON body
 * containing a `username` and a pre-hashed `hashedPassword`.
 *
 * The function performs the following steps:
 * 1. Reads the request body.
 * 2. Parses the JSON to extract credentials.
 * 3. Reads the `access.json` file, which stores valid user credentials.
 * 4. Compares the provided `username` and `hashedPassword` with the stored credentials.
 * 5. If valid, it creates a JWT containing the username.
 * 6. Sets the JWT in an `HttpOnly` session cookie and returns a success response.
 * 7. If invalid, or if any errors occur (e.g., file not found, bad JSON), it returns an appropriate error response.
 *
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object (not directly used in this function but passed by the router).
 */
async function handleLogin(req, res, config) {
    // This endpoint only supports POST requests.
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Method Not Allowed' }));
        return;
    }

    let body = '';
    // Collect the request body chunks.
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            // The client sends 'hashedPassword', so we must use that key here.
            const { username, hashedPassword } = JSON.parse(body);

            // Define the path to the access control file.
            const accessFilePath = path.join(__dirname, '..', 'config', 'access.json');
            let accessData;

            try {
                const fileContent = await fs.readFile(accessFilePath, 'utf-8');
                accessData = JSON.parse(fileContent);
            } catch (fileError) {
                // Handle cases where the access file is missing or unreadable.
                if (fileError.code === 'ENOENT') {
                    console.error('Security warning: config/access.json file not found. No logins will be possible.');
                } else {
                    console.error('Error reading or parsing access.json:', fileError);
                }
                // If the access file can't be read or parsed, deny access.
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Server configuration error.' }));
                return;
            }

            // Check if the username exists and the hashed password matches the one in the file.
            if (accessData[username] && accessData[username] === hashedPassword) {
                // Login successful. Create a JWT for the user's session.
                // The payload contains the username, which can be used for logging or identification.
                const token = await jwTokenServices.createJsonWebToken({username: username});

                // Set the JWT in a secure, HttpOnly cookie.
                // HttpOnly: Prevents client-side scripts from accessing the cookie, mitigating XSS attacks.
                // Max-Age: Sets the cookie's lifetime in seconds (e.g., 3600 = 1 hour).
                // SameSite=Strict: Prevents the cookie from being sent on cross-site requests, mitigating CSRF attacks.
                // Path=/: Makes the cookie available to all pages on the site.
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Set-Cookie': `sessionToken=${token}; HttpOnly; Max-Age=3600; SameSite=Strict; Path=/` // TODO: Max-Age should be configurable
                });
                res.end(JSON.stringify({ message: 'Login successful' }));
            } else {
                // Invalid credentials.
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Invalid username or password' }));
            }
        } catch (error) {
            // This catches errors from JSON.parse(body) if the request body is not valid JSON.
            console.error('Login error:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Invalid request body' }));
        }
    });
}

module.exports = {
    handleLogin
};