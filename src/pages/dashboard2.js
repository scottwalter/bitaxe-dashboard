const http = require('http');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const apiPath = '/api/system/info';

// Build collapsible tables for each device
function generateCollapsibleHtml(data, fieldsToDisplay){
   let filteredData = {};
  fieldsToDisplay.forEach(field => {
    filteredData[field] = data[field] !== undefined ? data[field] : 'N/A';
  });

  let contentHtml = '';
  for (const key in filteredData) {
    if (Object.hasOwnProperty.call(filteredData, key)) {
      contentHtml += `
            <p><strong>${key}:</strong> ${filteredData[key]}</p>`;
    }
  }
  const html =`<div class="collapsible-container">
        <button class="collapsible-button">View ${data.hostname}</button>
        <div class="collapsible-content">
            ${contentHtml}
        </div>
    </div>`;
  return html;
}; 
async function display (req,res,config){
try {
  const filterFields = config.display_fields;
  let tables='';
  // Use Promise.all to wait for all asynchronous operations
  await Promise.all(config.bitaxe_instances.map(async (instance, index) => {
    //Fetch the data for this instance
    const instanceName = Object.keys(instance)[0];
    const instanceUrl = instance[instanceName];
    const response = await fetch(instanceUrl + apiPath);
    const data = await response.json();
    let instanceTableContent = generateCollapsibleHtml(data,filterFields);

    return instanceTableContent; // Return the HTML string for this instance
  }))
  .then(results => {
    // Concatenate all the individual table contents after all promises resolve
    tables += results.join('');
  });
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

