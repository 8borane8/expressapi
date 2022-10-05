const https = require("https");
const mysql = require("mysql");
const fs = require("node:fs");
const http = require("http");
const mime = require('mime');
const CryptoJS = require("crypto-js");
const WebSocketServer = require('ws');

class Server{
    constructor(host = "localhost", port = 3000, endpoint = ""){
        this.host = host;
        this.port = port;
        this.endpoint = endpoint;

        this.routes = {
            "get": {},
            "post": {},
            "options": {}
        };
        this.middlewares = [];
        this.server = http.createServer(this.requestListener);
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
        this.routes.get[this.endpoint + route] = fnc;
        this.updateConfig();
    }

    post(route, fnc){
        this.routes.post[this.endpoint + route] = fnc;
        this.updateConfig();
    }

    options(route, fnc){
        this.routes.options[this.endpoint + route] = fnc;
        this.updateConfig();
    }


    use(fnc){
        this.middlewares.push(fnc);
        this.updateConfig();
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
            req.params = {};
    
            if(req.url.split("?").length == 2){
                
                for(let x of req.url.split("?")[1].split("&")){
                    req.query[x.split("=")[0]] = this.this.isEmpty(x.split("=")[1]) ? undefined : x.split("=")[1];
                }
                req.url = req.url.split("?")[0];
            }

            if(this.this.routes[req.method.toLowerCase()][req.url] == undefined){
                if(this.this.routes[req.method.toLowerCase()][req.url + "/"] == undefined){
                    let final_url = "";
                    let paths = req.url.split("/").filter(part => part != "");
                    let endpoints = Object.keys(this.this.routes[req.method.toLowerCase()]);
                    for(let i = 0; i < endpoints; i++){
                        endpoints[i] = endpoints[i].split("/").filter(part => part != "");
                    }

                    for(let endpoint of endpoints){
                        endpoint = endpoint.split("/").filter(part => part != "")
                        if(endpoint.length == paths.length){
                            for(let i = 0; i <= paths.length; i++){
                                if(i == paths.length){
                                    final_url = "/" + endpoint.join("/");
                                    break;
                                }

                                if(endpoint[i] == paths[i]){
                                    continue;
                                }
                                
                                if(endpoint[i].startsWith(":")){
                                    req.params[endpoint[i].split(":")[1]] = paths[i];
                                    continue;
                                }
                                final_url = "";
                                req.params = {};
                                break;
                            }
                            if(final_url != ""){ return this.this.routes[req.method.toLowerCase()][final_url](req, res);}
                        }
                        
                    }
                    res.status(404).send({ success: false, error: "Endpoint not found !" });
                }else{
                    this.this.routes[req.method.toLowerCase()][req.url + "/"](req, res);
                }
            }else{
                this.this.routes[req.method.toLowerCase()][req.url](req, res);
            }



        });
    }

    listen(fnc = function(){ console.log(`Server listening on: http://${this.host}:${this.port}/${this.endpoint}`); }){
        this.server.listen(this.port, this.host, this.listenCallback, fnc.bind(this));
    }

    updateConfig(){
        this.server.this = this;
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
                return err ? reject(err) : resolve(results);
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


module.exports.request = function(url = "http://www.exemple.com/", options = null, callback = null){
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
        var req;
        try{
            req = http.request(url, options, default_callback);
        }catch{
            req = https.request(url, options, default_callback);
        }
            
        if(options.body != undefined){
            req.end(options.body);
        }else{
            req.end();
        }
    });
}

module.exports.encodeBody = function(dic){
    let body = [];
    for(let property of Object.keys(dic)){
        body.push(encodeURIComponent(property) + "=" + encodeURIComponent(dic[property]));
    }
    return body.join("&");
}

module.exports.isEmpty = function(str){
    try{
        if(str == undefined){
            return true;
        }else if(str == null){
            return true;
        }else if(typeof str != String){
            return true;
        }else if(str.replaceAll(" ", "") == ""){
            return true;
        }else if(str.replaceAll("   ", "") == ""){
            return true;
        }else if(str.replaceAll("ㅤ", "") == ""){
            return true;
        }
        return false;
    }catch{
        return true;
    }
}

module.exports.sha256 = function(text){ return CryptoJS.SHA256(text).toString(); }
module.exports.sha512 = function(text){ return CryptoJS.SHA512(text).toString(); }
module.exports.b64UrlEncode = function(text){ return CryptoJS.enc.Base64url.stringify(CryptoJS.enc.Utf8.parse(text)); }
module.exports.b64UrlDecode = function(text){ return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64url.parse(text)); }