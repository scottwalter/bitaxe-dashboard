const http = require('http');
const fs = require('fs').promises; // Import the promise-based fs module
const path = require('path');

async function display(req, res){
    try{
        const apiDirectory = path.join(__dirname, '/demo-apis');
        const jsonName = 'bitaxe-info1.json';
        const jsonPath = path.join(apiDirectory, jsonName);
        console.log(`API PATH: ${jsonPath}`);

        // Await the file read operation. Errors from readFile will now be caught by the outer try...catch.
        const data = await fs.readFile(jsonPath);
        //console.log(`Found Data; ${data}`);

        let contentType = 'application/json';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data); // data is a Buffer by default from fs.promises.readFile, which res.end can handle.

    }catch(error){
        console.error('Demo API: Error fetching or processing data:', error);
        // Important: Check if headers have already been sent before attempting to write new ones.
        // This prevents the "Cannot write headers after they are sent" error if an error
        // occurred *after* headers were already sent (e.g., by res.writeHead(200) above).
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error</h1><p>Could not fetch data. Please check the server and network.</p><p>${error.message}</p>`);
        } else {
            // If headers were already sent, we can't change the status code.
            // Just log the error, and the connection might eventually close or time out.
            console.error('Headers already sent, cannot send 500 error response. Original error:', error);
        }
    }
    
}
module.exports={
    display
}