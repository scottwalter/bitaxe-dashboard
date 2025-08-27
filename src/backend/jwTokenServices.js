/**
 * @file the file provides the tools to manage jsonwebtokens used in the sessionToken cookie when authentication is turned on for the site
 */
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

async function createJsonWebToken(payload){
    // Define your secret key (keep this secure and in an environment variable)
    const secretKey = 'your_super_secret_key'; // Replace with a strong, random key

    // Define options for the token (e.g., expiration time)
    const options = {
      expiresIn: '1h' // Token expires in 1 hour
    };

    // Create the JWT
    const token = jwt.sign(payload, secretKey, options);

    return token;
}
async function testCreate(){
    const payload = {
      userId: 'user123',
      username: 'exampleuser',
      role: 'admin'
    };
    // Define your secret key (keep this secure and in an environment variable)
    const secretKey = 'your_super_secret_key'; // Replace with a strong, random key

    // Define options for the token (e.g., expiration time)
    const options = {
      expiresIn: '1h' // Token expires in 1 hour
    };

    // Create the JWT
    const token = jwt.sign(payload, secretKey, options);
    console.log(token);
    return token;
}

module.exports = {
    createJsonWebToken,
    testCreate
}