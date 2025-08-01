const http = require('http');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const port = process.env.PORT || 3000;
const apiUrlBitAxe1 = 'http://192.168.7.220/api/system/info';
const apiUrlBitAxe2 = 'http://192.168.7.122/api/system/info';

const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    try {
      /* Pull Data from BitAxe1 */
      const response1 = await fetch(apiUrlBitAxe1);
      const data1 = await response1.json();
      /* Pull Data from BitAxe2 */
      const response2 = await fetch(apiUrlBitAxe2);
      const data2 = await response2.json();
      /* Build table for BitAxe1 */
      let tableHtml1 = '<table border="1">';
      for (const key in data1) {
        tableHtml1 += `<tr><td>${key}</td><td>${data1[key]}</td></tr>`;
      }
      tableHtml1 += '</table>';
      /* Build table for BitAxe2 */
      let tableHtml2 = '<table border="1">';
      for (const key in data2) {
        tableHtml2 += `<tr><td>${key}</td><td>${data2[key]}</td></tr>`;
      }
      tableHtml2 += '</table>';
      /* Build Master table */
      let tableHtmlTotal ='<table border="1">';
      tableHtmlTotal +=`<tr><td>${tableHtml1}</td><td>${tableHtml2}</td></tr>`;
      tableHtmlTotal+='</table>';
      /*Display master table on web page */
      fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, htmlContent) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error loading index.html');
        } else {
          const finalHtml = htmlContent.replace('<!-- DATA_TABLE -->', tableHtmlTotal);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(finalHtml);
        }
      });

    } catch (error) {
      console.error('Error fetching or processing data:', error);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error</h1><p>Could not fetch data from ${apiUrlBitAxe1}. Please check the server and network.</p><p>${error.message}</p>`);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Attempting to fetch data from ${apiUrlBitAxe1}`);
});
