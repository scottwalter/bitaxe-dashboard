const http = require('http');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

//const apiUrlBitAxe1 = 'http://192.168.7.220/api/system/info';
//const apiUrlBitAxe2 = 'http://192.168.7.122/api/system/info';
const apiPath = '/api/system/info';

async function display (req,res,config){
try {
    //new method
    let tables = '<table border="1"><tr>';

// Use Promise.all to wait for all asynchronous operations
await Promise.all(config.bitaxe_instances.map(async (instance, index) => {
    //Fetch the data for this instance
    const instanceName = Object.keys(instance)[0];
    const instanceUrl = instance[instanceName];
    //console.log(`About to fetch: ${instanceName} ${instanceUrl} ${apiPath}`);
    const response = await fetch(instanceUrl + apiPath);
    const data = await response.json();
    //console.log(`Fecthed: ${data}`);

    // Build the inner table content for this instance
    let instanceTableContent = '<td><table border="1">';
    for (const key in data) {
        //console.log(`reading key ${key} with value ${data[key]}`);
        instanceTableContent += `<tr><td>${key}</td><td>${data[key]}</td></tr>`;
    }
    instanceTableContent += '</table></td>';
    return instanceTableContent; // Return the HTML string for this instance
}))
.then(results => {
    // Concatenate all the individual table contents after all promises resolve
    tables += results.join('');
});

// Close up the master table
tables += '</tr></table>';

// Now 'tables' will contain the complete HTML structure
    //End new method
      console.log(`Config: ${config.bitaxe_instances}`);
      // Display master table on web page
      fs.readFile(path.join(__dirname, 'dashboard.html'), 'utf8', (err, htmlContent) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error loading index.html');
        } else {
          const finalHtml = htmlContent.replace('<!-- DATA_TABLE -->', tables);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(finalHtml);
        }
      });

    } catch (error) {
      console.error('Error fetching or processing data:', error);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error</h1><p>Could not fetch data. Please check the server and network.</p><p>${error.message}</p>`);
    }
    return '1';
  };
 
module.exports ={
    display
}

