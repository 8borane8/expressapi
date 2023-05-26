const https = require("https");
const http = require("http");
const mime = require('mime');
const fs = require("fs");

const urlRegex = /^(?:\/[^\/]+)+$/;

class HttpServer{
    constructor(port, endpoint = "", sslKey = null, sslCert = null){
        if(endpoint != "" && !urlRegex.test(endpoint)){
            throw new Error(`Invalid endpoint format. Please provide a valid format: ${urlRegex}`);
        }

        this.port = port;
        this.endpoint = endpoint;

        this.routes = {
            GET    : {},
            POST   : {},
            PUT    : {},
            DELETE : {},
            PATCH  : {}
        };

        this.middlewares = [];

        if([sslKey, sslCert].includes(null)){
            this.server = http.createServer(this.serverRequestListener.bind(this));
            return;
        }

        this.server = https.createServer({
            key: fs.readFileSync(sslKey),
            cert: fs.readFileSync(sslCert)
        }, this.serverRequestListener.bind(this));
    }

    registerRoute(route, fnc, method){
        if(!urlRegex.test(route)){
            throw new Error(`Invalid route format. Please provide a valid format: ${urlRegex}`);
        }

        route = this.endpoint + route;
        if(Object.keys(this.routes[method]).includes(route)){
            throw new Error("Route already registered for this HTTP method.");
        }

        this.routes[method][route] = fnc;
    }


    get(route, fnc){
        this.registerRoute(route, fnc, "GET");
    }

    post(route, fnc){
        this.registerRoute(route, fnc, "POST");
    }

    put(route, fnc){
        this.registerRoute(route, fnc, "PUT");
    }

    delete(route, fnc){
        this.registerRoute(route, fnc, "DELETE");
    }

    patch(route, fnc){
        this.registerRoute(route, fnc, "PATCH");
    }

    use(fnc){
        this.middlewares.push(fnc);
    }


    notFoundEndpointFunction(_req, res){
        res.status(404).send({
            success: false,
            error: "404 Endpoint not found."
        });
    }

    setNotFoundEndpointFunction(fnc){
        this.notFoundEndpointFunction = fnc;
    }
    
    defaultListenCallback(){
        console.log(`HttpServer listening on: http://127.0.0.1:${this.port}${this.endpoint}`);
    }

    listen(fnc = this.defaultListenCallback){
        this.server.listen(this.port, "0.0.0.0", 511, fnc.bind(this));
    }

    async serverRequestListener(req, res){
        req.body = [];

        res.status = function(code){
            res.statusCode = code;
            return res;
        }

        res.send = function(content){
            if(typeof(content) != "string")
            {
                try {
                    content = JSON.stringify(content);
                    res.setHeader("Content-Type", "application/json");
                }catch{}
            }
            
            res.end(content);
        };

        res.redirect = function(url){
            res.writeHead(302, {
                "Location": url
            });
            res.end();
        };

        res.sendFile = function(path){
            res.setHeader("Content-Type", mime.getType(path));
            res.setHeader("Content-Length", fs.statSync(path).size);

            fs.createReadStream(path).pipe(res);
        }

        req.once("error", function(err){
            console.log(err);
        });

        req.on("data", function(chunk){
            req.body.push(chunk);
        });

        req.once("end", async function(){
            if(!Object.keys(this.routes).includes(req.method)){
                res.status(400).send({
                    success: false,
                    error: "400 Method not supported."
                });
                return;
            }

            req.url = decodeURI(req.url);
            req.url = req.url.replaceAll(/\/{2,}/g, "/");
            req.url = req.url.replace(/([^\/]+)\/$/, "$1");

            req.body = Buffer.concat(req.body).toString();
            try { req.body = JSON.parse(req.body); }catch{}

            req.query = {};
            if(req.url.split("?").length == 2){
                let splitedUrl = req.url.split("?");
                for(const parts of splitedUrl[1].split("&")){
                    req.query[parts.split("=")[0]] = parts.split("=")[1];
                }
                req.url = splitedUrl[0];
            }

            for(const middleware of this.middlewares){
                if(await middleware(req, res) == true){
                    return;
                }
            }

            if(req.method == "OPTIONS"){
                res.status(200).end();
                return;
            }
            
            if(Object.keys(this.routes[req.method]).includes(req.url)){
                this.routes[req.method][req.url](req, res);
                return;
            }

            for(const endpoint of Object.keys(this.routes[req.method])){
                const endpointParts = endpoint.slice(1).split("/");
                const urlParts = req.url.slice(1).split("/");
                if(endpointParts.length != urlParts.length){ continue; }

                const params = {};
                for(let i = 0; i < endpointParts.length; i++){
                    if(endpointParts[i].startsWith(":")){
                        params[endpointParts[i].slice(1)] = urlParts[i];
                    }else if(endpointParts[i] != urlParts[i]){
                        break;
                    }
                    
                    if(i == endpointParts.length - 1){
                        req.params = params;
                        this.routes[req.method][endpoint](req, res);
                        return;
                    }
                }
            }
            
            this.notFoundEndpointFunction(req, res);
        }.bind(this));
    }
}

module.exports.HttpServer = HttpServer;