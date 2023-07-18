const CryptoJS = require("crypto-js");
const https = require("https");
const http = require("http");


function request(url, options = null) {
    options = options == null ? {
        method: "GET",
        headers: {}
    } : options;
  
    return new Promise(function (resolve, reject) {
      const protocol = url.startsWith("https://") ? require("https") : require("http");
      const req = protocol.request(url, options, function (response) {
            const body = [];
    
            response.on("error", function (error) {
                reject(error);
            });
    
            response.on("data", function (chunk) {
                body.push(chunk);
            });
    
            response.on("end", function () {
                const responseText = Buffer.concat(body).toString();

                if (response.headers["content-type"] && response.headers["content-type"].startsWith("application/json")) {
                    resolve(JSON.parse(responseText));
                }else{
                    resolve(responseText);
                }
            });
        });

        req.on("error", function (error) {
            reject(error);
        });
    
        req.end(options.body);
    });
  }

function encodeBody(dic){
    return encodeURI(
        Object.entries(dic).map(
            ([k, v]) => `${k}=${v}`
        ).join('&')
    );
}

function sha512(text){
    return CryptoJS.SHA512(text).toString();
}

function sha256(text){
    return CryptoJS.SHA256(text).toString();
}

module.exports = {
    ...require("./classes/HttpServer.js"),
    ...require("./classes/JsonToken.js"),
    ...require("./classes/Mysql.js"),

    request,
    encodeBody,
    sha512,
    sha256
};