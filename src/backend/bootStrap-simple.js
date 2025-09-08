/**
 * @file Simple Bootstrap Router - Test version
 */

async function route(req, res) {
    try {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
            <head><title>Bootstrap Mode</title></head>
            <body>
                <h1>Bitaxe Dashboard Bootstrap</h1>
                <p>Bootstrap mode is working! This is a test page.</p>
                <p>URL: ${req.url}</p>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Bootstrap router error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
    }
}

module.exports = { route };