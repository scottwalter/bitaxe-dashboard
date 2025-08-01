const http = require('http');
const d = require('../pages/dashboard');
const fav = require('../pages/favicon');

async function dispatch(req,res){
    //Handler for homepage
    if (req.url === '/' || req.url === '/index.html') {
        results = await(d.display(req,res));
        console.log(`Dashboard call results: ${results}`);
    } else {
      if( req.url ==='/favicon.ico'){
        results = await(fav.display(req,res));
      }else{
         res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    }


};
module.exports ={
    dispatch
};

/* Favicon image
  if (req.url === '/favicon.ico') {
    try {
      const imagePath = path.join(__dirname, 'favicon.ico');
      fs.readFile(imagePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Image not found');
                return;
            }

            res.writeHead(200, { 'Content-Type': 'image/x-icon' }); // Adjust MIME type as needed
            res.end(data); // Send the image data as a buffer
        });
      
    }catch (error){ console.error(error)};
  } else {
    
  }
    */