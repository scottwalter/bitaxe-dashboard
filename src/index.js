const http = require('http');
const fs = require('fs');
const path = require('path');
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

  const server = http.createServer(async (req, res) => {
    // Lets find some page to present to the website!
    console.log( `${new Date().toISOString()} Request made to: ${req.url}`);
    await(d.dispatch(req,res,config));
  });
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Start time: ${new Date().toISOString()}`);
  });
});
