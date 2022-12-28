const https = require("https");
const mysql = require("mysql");
const fs = require("fs");
const http = require("http");
const mime = require('mime');
const CryptoJS = require("crypto-js");
const { WebSocketServer } = require('ws');

async function httpServerRequestListener(req, res){
    req.body = [];
    req.on('error', async function(err){
        console.error(err);
    }).on('data', async function(chunk){
        req.body.push(chunk);
    }).on('end', async function(){
        req.body = Buffer.concat(req.body).toString();
        try { req.body = JSON.parse(req.body); }catch{}

        res.status = function(code){
            res.statusCode = code;
            return res;
        }

        res.send = function(content){
            if(content.constructor === ({}).constructor){
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(content));
            }else{
                res.end(content);
            }
        };

        res.redirect = function(url){
            res.writeHead(302, {
                'Location': url
            });
            res.end();
        };

        res.sendFile = function(path){
            res.setHeader("Content-Type", mime.getType(path));
            res.setHeader("Content-Length", fs.statSync(path).size);

            fs.createReadStream(path).pipe(res);
        }

        for(let middleware of this.middlewares){
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
                req.query[x.split("=")[0]] = escapeWhiteSpaceAndNullValues(x.split("=")[1]) ? undefined : x.split("=")[1];
            }
            req.url = req.url.split("?")[0];
        }

        let routes = this.routes[req.method.toLowerCase()];
        let url = req.url;
        while(url.length != 1 && url.endsWith("/")){ url = url.slice(0, -1); }
        while(url.includes("//")){ url = url.replaceAll("//", "/"); }
        if(Object.keys(routes).includes(url)){
            return routes[url](req, res);
        }

        let valid_endpoint = null;
        for(let endpoint of Object.keys(routes)){
            let endpointParts = endpoint.slice(1).split("/");
            let urlParts = url.slice(1).split("/");
            if(endpointParts.length != urlParts.length){ continue; }

            let isValid = true;
            let params = {};
            for(let index = 0; index < endpointParts.length; index++){
                if(endpointParts[index].startsWith(":")){
                    params[endpointParts[index].slice(1)] = urlParts[index];
                    continue;
                }else if(endpointParts[index] == urlParts[index]){ continue; }
                else{
                    isValid = false;
                    break;
                }
            }
            if(isValid && (valid_endpoint == null || valid_endpoint.split("/").filter(e => !e.startsWith(":")).length < endpoint.split("/").filter(e => !e.startsWith(":")).length)){ valid_endpoint = endpoint; req.params = params; }
        }

        if(valid_endpoint != null){ return routes[valid_endpoint](req, res); }
        
        this.notFoundEndpointFunction(req, res);
    });
}

class HttpServer{
    constructor(port = 3000, endpoint = "", sslKey = null, sslCert = null){
        this.port = port;
        this.endpoint = endpoint;
        this.sslKey = sslKey;
        this.sslCert = sslCert;
        this.notFoundEndpointFunction = function(req, res){
            return res.status(404).send({ success: false, error: "Endpoint not found !" });
        }.bind(this);

        if(!this.endpoint.startsWith("/")){ this.endpoint = "/" + this.endpoint; }
        while(this.endpoint.endsWith("/")){ this.endpoint = this.endpoint.slice(0, -1); }

        this.routes = {
            "get": {},
            "post": {},
            "options": {}
        };
        this.middlewares = [];

        if(this.sslKey != null && this.sslCert != null){
            this.server = https.createServer({
                key: fs.readFileSync(this.sslKey),
                cert: fs.readFileSync(this.sslCert)
            }, this.requestListener);
        }else{
            this.server = http.createServer(this.requestListener);
        }

        this.server.this = this;
    }

    get(route, fnc){
        route = this.endpoint + route;
        if(!route.startsWith("/")){ route = "/" + route; }
        while(route.endsWith("/")){ route = route.slice(0, -1); }
        if(Object.keys(this.routes.post).includes(this.endpoint + route)){ throw "This endpoint already exist !" }
        this.routes.get[route] = fnc.bind(this);
    }

    post(route, fnc){
        route = this.endpoint + route;
        if(!route.startsWith("/")){ route = "/" + route; }
        while(route.endsWith("/")){ route = route.slice(0, -1); }
        if(Object.keys(this.routes.post).includes(this.endpoint + route)){ throw "This endpoint already exist !" }
        this.routes.post[route] = fnc.bind(this);
    }

    use(fnc){ this.middlewares.push(fnc); }

    setNotFoundEndpointFunction(fnc){ this.notFoundEndpointFunction = fnc.bind(this); }

    listen(fnc = function(){ console.log(`HttpServer listening on: http`+ (this.sslKey != null && this.sslCert != null ? "s" : "") +`://localhost:${this.port}${this.endpoint}`); }){
        this.server.listen(this.port, "0.0.0.0", httpServerRequestListener.bind(this), fnc.bind(this));
    }
}

class Mysql{
    constructor(options){
        this.options = options;
        this.conn = mysql.createConnection(this.options);

        this.conn.connect(); 
        setInterval(this.saveConn.bind(this), 10000);
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

        return encoded_payload + "." + sha256(encoded_payload + this.secret);
    }

    verif(token){
        try{
            let decoded_token = CryptoJS.enc.Base64url.parse(token.split(".")[0]);
            decoded_token = JSON.parse(CryptoJS.enc.Utf8.stringify(decoded_token));
            if(sha256(token.split(".")[0] + this.secret) == token.split(".")[1]){ return decoded_token; }

            return null;
        }catch(err){
            console.log(err);
            return null;
        }
    }
}

class WebSocket{
    constructor(port){
        this.port = port;
        this.onConnect = function(){};
        this.onMessage = function(){};
    }

    setOnConnectFunction(fnc){
        this.onConnect = fnc.bind(this);
    }

    setOnMessageFunction(fnc){
        this.onMessage = fnc.bind(this);
    }

    listen(fnc = function(){ console.log(`WebSocket listening on: ws://localhost:${this.port}`); }){
        this.ws = new WebSocketServer({ port: this.port });

        this.ws.on('connection', function(socket){
            this.onConnect(socket);
            socket.on('message', this.onMessage);
        }.bind(this));

        fnc.bind(this)();
    }
}

module.exports.HttpServer = HttpServer;
module.exports.Mysql = Mysql;
module.exports.JsonToken = JsonToken;
module.exports.WebSocket = WebSocket;

function tryGetJsonWebTokenPayload(token){
    try{ return JSON.parse(Buffer.from(token.split(".")[0], "base64")); }catch{ return null; }
}

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

module.exports.tryGetJsonWebTokenPayload = tryGetJsonWebTokenPayload;
module.exports.request = request;
module.exports.encodeBody = encodeBody;
module.exports.escapeWhiteSpaceAndNullValues = escapeWhiteSpaceAndNullValues;
module.exports.sha256 = sha256;
module.exports.sha512 = sha512;