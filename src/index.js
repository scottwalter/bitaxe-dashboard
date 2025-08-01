const http = require('http');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const d = require('./controller/dispatcher');

//Lets load the configuration file
fs.readFile(path.join(__dirname,'./config/config.json'), 'utf8', (err, data) => {
  console.log('PATH: '+__dirname);
  if (err) {
      console.error('Error reading file:', err);
  }
  let config;
  try {
    config = JSON.parse(data);
    console.log(`Configuration: ${data}`);
  } catch (parseError) {
    console.error('Error parsing Config JSON:', parseError);
  } 
  const port = process.env.PORT ||config.web_server_port;
  
  const apiUrlBitAxe1 = 'http://192.168.7.220/api/system/info';
  const apiUrlBitAxe2 = 'http://192.168.7.122/api/system/info';

  const server = http.createServer(async (req, res) => {
    // Lets find some page to present to the website!
    await(d.dispatch(req,res));
  });
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Attempting to fetch data from ${apiUrlBitAxe1}`);
  });
});
