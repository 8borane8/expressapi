const https = require("https");
const mysql = require("mysql");
const fs = require("node:fs");
const http = require("http");
const mime = require('mime');

class Server{
    constructor(host = "localhost", port = 3000, endpoint = ""){
        this.host = host;
        this.port = port;
        this.endpoint = endpoint

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
                        }
                        
                    }
                    if(final_url != ""){
                        this.this.routes[req.method.toLowerCase()][final_url](req, res);
                    }else{
                        res.status(404).send({ success: false, error: "Endpoint not found !" });
                    }
                }else{
                    this.this.routes[req.method.toLowerCase()][req.url + "/"](req, res);
                }
            }else{
                this.this.routes[req.method.toLowerCase()][req.url](req, res);
            }



        });
    }

    listen(fnc = function(){ console.log("Server listening ..."); }){
        this.server.listen(this.port, this.host, this.listenCallback, fnc);
    }

    updateConfig(){
        this.server.this = this;
    }
}

function request(url = "http://www.exemple.com/", options = null, callback = null){
    url
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
        }
        var req;
        try{
            req = http.request(url, options, default_callback);
        }catch{
            req = https.request(url, options, default_callback)
        }
            
        if(options.body != undefined){
            req.end(options.body);
        }else{
            req.end();
        }
    });
}

class Mysql{
    constructor(options){
        this.options = options;
        this.conn = mysql.createConnection(this.options);

        this.conn.connect();
    }

    async query(sql, options){
        return new Promise((resolve, reject) => {
            this.conn.query(sql, options, function(err, results){
                return err ? reject(err) : resolve(results);
                }
            );
        });
    }
}

module.exports.Server = Server;
module.exports.request = request;
module.exports.Mysql = Mysql;
module.exports.encodeBody = function(dic){
    let body = [];
    for(let property of Object.keys(dic)){
        body.push(encodeURIComponent(property) + "=" + encodeURIComponent(dic[property]));
    }
    return body.join("&");
}