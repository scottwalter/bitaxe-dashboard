/**
 * @file Handles user authentication.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Handles a POST request to /api/login.
 * @param {import('http').IncomingMessage} req The HTTP request object.
 * @param {import('http').ServerResponse} res The HTTP response object.
 * @param {object} config The application configuration object.
 */
async function handleLogin(req, res, config) {
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Method Not Allowed' }));
        return;
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            // The client sends 'hashedPassword', so we must use that key here.
            const { username, hashedPassword } = JSON.parse(body);

            const accessFilePath = path.join(__dirname, '..', 'config', 'access.json');
            let accessData;

            try {
                const fileContent = await fs.readFile(accessFilePath, 'utf-8');
                accessData = JSON.parse(fileContent);
            } catch (fileError) {
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
                // Login successful. Set a session cookie.
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Set-Cookie': 'sessionToken=yourSecureTokenHere; HttpOnly; Max-Age=3600; SameSite=Strict; Path=/'
                });
                res.end(JSON.stringify({ message: 'Login successful' }));
            } else {
                // Invalid credentials.
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Invalid username or password' }));
            }
        } catch (error) {
            // This catches errors from parsing the request body.
            console.error('Login error:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Invalid request body' }));
        }
    });
}

module.exports = {
    handleLogin
};