const https = require("https");
const mysql = require("mysql");
const fs = require("node:fs");
const http = require("http");
const mime = require('mime');
const CryptoJS = require("crypto-js");
const WebSocketServer = require('ws');

class Server{
    constructor(port = 3000, endpoint = "", host = "0.0.0.0", sllKey = null, sllCert = null){
        this.host = host;
        this.port = port;
        this.endpoint = endpoint;

        if(!this.endpoint.startsWith("/")){ this.endpoint = "/" + this.endpoint; }
        while(this.endpoint.endsWith("/")){ this.endpoint = this.endpoint.slice(0, -1); }

        this.routes = {
            "get": {},
            "post": {},
            "options": {}
        };
        this.middlewares = [];

        if(sllKey != null && sllCert != null){
            this.server = https.createServer(this.requestListener, {
                key, sslKey,
                cert: sllCert
            });
        }else{
            this.server = http.createServer(this.requestListener);
        }

        this.server.this = this;
    }

    isEmpty(str){
        if(str == undefined){
            return true;
        }else if(str == null){
            return true;
        }else if(str.replaceAll("%20", "") == ""){
            return true;
        }
        return false;
    }

    get(route, fnc){
        if(!route.startsWith("/")){ route = "/" + route; }
        while(route.endsWith("/")){ route = route.slice(0, -1); }
        if(Object.keys(this.routes.get).includes(this.endpoint + route)){ throw "This endpoint already exist !" }
        this.routes.get[this.endpoint + route] = fnc;
        this.server.this = this;
    }

    post(route, fnc){
        if(!route.startsWith("/")){ route = "/" + route; }
        while(route.endsWith("/")){ route = route.slice(0, -1); }
        if(Object.keys(this.routes.post).includes(this.endpoint + route)){ throw "This endpoint already exist !" }
        this.routes.post[this.endpoint + route] = fnc;
        this.server.this = this;
    }

    use(fnc){
        this.middlewares.push(fnc);
        this.server.this = this;
    }

    requestListener(req, res){
        req.body = [];
        req.on('error', (err) => {
            console.error(err);
        }).on('data', (chunk) => {
            req.body.push(chunk);
        }).on('end', () => {
            req.body = Buffer.concat(req.body).toString();
            try { req.body = JSON.parse(req.body); }catch{}

            res.status = function(code){
                res.statusCode = code;
                return res;
            }

            res.send = function(content){
                if(content.constructor === ({}).constructor){
                    res.setHeader("Content-Type", "application/json")
                    res.end(JSON.stringify(content));
                }else{
                    res.end(content);
                }
            };
    
            res.sendFile = function(path){
                res.setHeader("Content-Type", mime.getType(path))
                res.setHeader("Content-Length", fs.statSync(path).size)
    
                fs.createReadStream(path).pipe(res);
            }
    
            for(let middleware of this.this.middlewares){
                if(middleware(req, res) == true){
                    return;
                }
            }

            if(req.method == "OPTIONS"){
                return res.status(200).end();
            }
    
            req.query = {};
    
            if(req.url.split("?").length == 2){
                for(let x of req.url.split("?")[1].split("&")){
                    req.query[x.split("=")[0]] = this.this.isEmpty(x.split("=")[1]) ? undefined : x.split("=")[1];
                }
                req.url = req.url.split("?")[0];
            }

            let routes = this.this.routes[req.method.toLowerCase()];
            let url = req.url;
            while(url.endsWith("/")){ url = url.slice(0, -1); }
            while(url.includes("//")){ url = url.replaceAll("//", "/"); }

            if(Object.keys(routes).includes(req.url)){
                return routes[req.url](req, res);
            }

            for(let endpoint of Object.keys(routes)){
                let endpointParts = endpoint.slice(1).split("/");
                let urlParts = url.slice(1).split("/");
                if(endpointParts.length != urlParts.length){ continue; }

                let isValid = true;
                req.params = {};
                for(let index = 0; index < endpointParts.length; index++){
                    if(endpointParts[index].startsWith(":")){
                        req.params[endpointParts[index].slice(1)] = urlParts[index];
                        continue;
                    }else if(endpointParts[index] == urlParts[index]){ continue; }
                    else{
                        isValid = false;
                        break;
                    }
                }
                if(isValid){ return routes[endpoint](req, res); }
            }
            
            return res.status(404).send({ success: false, error: "Endpoint not found !" });
        });
    }

    listen(fnc = function(){ console.log(`Server listening on: http://${this.host}:${this.port}${this.endpoint}`); }){
        this.server.listen(this.port, this.host, this.listenCallback, fnc.bind(this));
    }
}

class Mysql{
    constructor(options){
        this.options = options;
        this.conn = mysql.createConnection(this.options);

        this.conn.connect();
        setInterval(this.saveConn.bind(this), 1000);
    }

    async query(sql, options){
        return new Promise((resolve, reject) => {
            this.conn.query(sql, options, function(err, results){
                return err ? resolve(err) : resolve(results);
                }
            );
        });
    }

    saveConn(){
        this.conn.query("SELECT 1", function(){});
    }
}

class JsonToken{
    constructor(secret){
        this.secret = secret;
    }

    sign(payload){
        let encoded_payload = CryptoJS.enc.Utf8.parse(JSON.stringify(payload));
        encoded_payload = CryptoJS.enc.Base64url.stringify(encoded_payload);

        return encoded_payload + "." + CryptoJS.SHA256(encoded_payload + this.secret)
    }

    verif(token){
        try{
            let decoded_token = CryptoJS.enc.Base64url.parse(token.split(".")[0]);
            decoded_token = JSON.parse(CryptoJS.enc.Utf8.stringify(decoded_token));
            if(CryptoJS.SHA256(token.split(".")[0] + this.secret) == token.split(".")[1]){
                return decoded_token;
            }

            return null;
        }catch(err){
            console.log(err);
            return null;
        }
    }

    tryGetPayload(){
        try{
            return JSON.parse(Buffer.from(token.split(".")[0], "base64"));
        }catch{ return {}; }
    }
}

class WebSocket{
    constructor(port, callback){
        this.ws = new WebSocketServer.Server({ port: port });

        this.ws.sockets = [];
        this.ws.on('connection', function (socket) {
            this.sockets.push(socket);

            socket.on('message', async function (data) {
                callback(this, data.toString());
            });

            socket.on('close', function () {
                this.sockets = this.sockets.filter(s => s !== socket);
            });
        });

        console.log("WebSocket is running on port: " + port + " ...");
    }
}

module.exports.Server = Server;
module.exports.Mysql = Mysql;
module.exports.JsonToken = JsonToken;
module.exports.WebSocket = WebSocket;


function request(url, options = null, callback = null){
    options = options == null ? {
        method: 'GET',
        headers: {}
    } : options;

    return new Promise((resolve, reject) => {
        function default_callback(response) {
            let data = '';
            response.on('data', function (chunk) {
                data += chunk;
            });
          
            response.on('end', function () {
                if(callback != null){ callback(data); }
                resolve(data);
            });

            response.on('error', function (error) {
                reject(error);
            });
        }

        let req;
        if(url.startsWith("https://")){
            req = https.request(url, options, default_callback);
        }else{
            req = http.request(url, options, default_callback);
        }

        if(options.body != undefined){
            req.end(options.body);
        }else{
            req.end();
        }
    });
}

function encodeBody(dic){
    let body = [];
    for(let property of Object.keys(dic)){
        body.push(encodeURIComponent(property) + "=" + encodeURIComponent(dic[property]));
    }
    return body.join("&");
}

function escapeWhiteSpaceAndNullValues(arg){
    try{
        if(arg == undefined){
            return "";
        }else if(arg == null){
            return "";
        }else if(typeof arg != "string"){
            return argToString(arg.toString());
        }

        return arg.replaceAll(" ", "").replaceAll("ㅤ", "");
    }catch(err){
        console.log(err)
        return true;
    }
}

function sha256(text){ return CryptoJS.SHA256(text).toString(); }
function sha512(text){ return CryptoJS.SHA512(text).toString(); }


module.exports.request = request;
module.exports.encodeBody = encodeBody;
module.exports.escapeWhiteSpaceAndNullValues = escapeWhiteSpaceAndNullValues;
module.exports.sha256 = sha256;
module.exports.sha512 = sha512;
