const http = require('http');
const d = require('../pages/dashboard2');
const fav = require('../pages/favicon');
const i = require('../pages/images');


async function dispatch(req,res,config){
    //Handler for homepage
    if (req.url === '/' || req.url === '/index.html') {
      results = await(d.display(req,res,config));
      console.log(`Dashboard call results: ${results}`);
      return; //Stop the if's
    } 
    // Favicon URL
    if( req.url ==='/favicon.ico'){
      results = await(fav.display(req,res));
      return;
    }
    // Generic Image server
    
    if (req.url.startsWith('/image/')) {
        results = await i.display(req,res);
        return;
      }
      // If nothing matches, show 404!
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      
    };
module.exports ={
    dispatch
};

