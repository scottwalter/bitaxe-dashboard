const http = require('http');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const port = process.env.PORT || 3000;
const apiUrl = 'http://192.168.7.220/api/system/info';

const server = http.createServer(async (req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      let tableHtml = '<table border="1">';
      for (const key in data) {
        tableHtml += `<tr><td>${key}</td><td>${data[key]}</td></tr>`;
      }
      tableHtml += '</table>';

      fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, htmlContent) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error loading index.html');
        } else {
          const finalHtml = htmlContent.replace('<!-- DATA_TABLE -->', tableHtml);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(finalHtml);
        }
      });

    } catch (error) {
      console.error('Error fetching or processing data:', error);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error</h1><p>Could not fetch data from ${apiUrl}. Please check the server and network.</p><p>${error.message}</p>`);
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Attempting to fetch data from ${apiUrl}`);
});
