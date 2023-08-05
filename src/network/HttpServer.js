import http from "http";
import mime from "mime";
import fs from "fs";

export class HttpServer{
    static #regexUrl = /^(?:\/[^\/]+)+$/;

    #middlewares = [];
    #routes = {
        GET    : {},
        POST   : {},
        PUT    : {},
        DELETE : {},
        PATCH  : {}
    };
    #server


    constructor(port, endpoint = ""){
        this.port = port;
        this.endpoint = endpoint;

        if(this.endpoint != "" && !HttpServer.#regexUrl.test(this.endpoint))
            throw new Error(`Invalid endpoint format. Please provide a valid format: ${HttpServer.#regexUrl}`);

        this.#server = http.createServer(this.#requestListener.bind(this));
    }

    #registerRoute(route, fnc, method){
        if(route != "/" && !HttpServer.#regexUrl.test(route))
            throw new Error(`Invalid route format. Please provide a valid format: ${HttpServer.#regexUrl}`);
        
        route = route == "/" ? this.endpoint : this.endpoint + route;

        if(Object.keys(this.#routes[method]).includes(route))
            throw new Error("Route already registered for this HTTP method.");

        this.#routes[method][route] = fnc;
    }


    get(route, fnc){
        this.#registerRoute(route, fnc, "GET");
    }

    post(route, fnc){
        this.#registerRoute(route, fnc, "POST");
    }

    put(route, fnc){
        this.#registerRoute(route, fnc, "PUT");
    }

    delete(route, fnc){
        this.#registerRoute(route, fnc, "DELETE");
    }

    patch(route, fnc){
        this.#registerRoute(route, fnc, "PATCH");
    }

    use(middleware){
        if(!middleware instanceof Function)
            throw new Error(`The middleware must be a function.`);

        this.#middlewares.push(middleware);
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
    
    static #defaultListenCallback(){
        console.log(`HttpServer listening on: http://127.0.0.1:${this.port}${this.endpoint}`);
    }

    listen(fnc = HttpServer.#defaultListenCallback){
        this.#server.listen(this.port, "0.0.0.0", 511, fnc.bind(this));
    }

    static #addFunctionsToResponse(res){
        res.status = function(code){
            res.statusCode = code;
            return res;
        }

        res.send = function(content){
            if(content instanceof Object){
                content = JSON.stringify(content);
                res.setHeader("Content-Type", "application/json");
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
    }

    async #requestListener(req, res){
        HttpServer.#addFunctionsToResponse(res);

        req.body = [];

        req.on("data", (chunk) => {
            req.body.push(chunk);
        });

        req.once("end", async () => {
            req.url = decodeURI(req.url);
            req.url = req.url.replaceAll(/\/{2,}/g, "/");
            req.url = req.url.replace(/([^\/]+)\/$/, "$1");

            req.body = Buffer.concat(req.body).toString();
            if (req.headers["content-type"] != undefined && req.headers["content-type"].startsWith("application/json"))
                req.body = JSON.parse(req.body);

            req.query = {};
            const splitedUrl = req.url.split("?");
            if(splitedUrl.length == 2){
                req.url = splitedUrl[0];

                for(const parts of splitedUrl[1].split("&")){
                    req.query[parts.split("=")[0]] = parts.split("=")[1];
                }
            }

            for(const middleware of this.#middlewares){
                if(await middleware(req, res) == true)
                    return;
            }

            if(req.method == "OPTIONS"){
                res.status(200).end();
                return;
            }

            if(!Object.keys(this.#routes).includes(req.method)){
                res.status(404).send({
                    success: false,
                    error: "404 Method not found."
                });
                return;
            }
            
            if(Object.keys(this.#routes[req.method]).includes(req.url)){
                await this.#routes[req.method][req.url](req, res);
                return;
            }

            for(const endpoint of Object.keys(this.#routes[req.method])){
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
                        this.#routes[req.method][endpoint](req, res);
                        return;
                    }
                }
            }
            
            this.notFoundEndpointFunction(req, res);
        });
    }
}