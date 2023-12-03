const http = require("http");
const mime = require("mime");
const fs = require("fs");

module.exports = class HttpServer{
    static #regexUrl = /^(?:\/[^\/]+)+$/;

    #port;
    #endpoint;

    #endpointNotFoundFunction = HttpServer.#defaultEndpointNotFoundFunction;
    #middlewares = new Array();
    #routes = new Map();

    #server;

    constructor(port, endpoint = ""){
        this.#port = port;
        this.#endpoint = endpoint;

        if(!(this.#endpoint == "" || HttpServer.#regexUrl.test(this.#endpoint)))
            throw new Error(`Invalid endpoint format. Please provide a valid format: ${HttpServer.#regexUrl}`);

        this.#server = http.createServer(this.#requestListener.bind(this));
    }

    get port(){
        return this.#port;
    }

    get endpoint(){
        return this.#endpoint;
    }

    set endpointNotFoundFunction(endpointNotFoundFunction){
        this.#endpointNotFoundFunction = endpointNotFoundFunction;
    }

    #registerRoute(route, requestListener, middlewares, method){
        if(!(route == "/" || HttpServer.#regexUrl.test(route)))
            throw new Error(`Invalid route format. Please provide a valid format: ${HttpServer.#regexUrl}`);
        
        if(!requestListener instanceof Function)
            throw new Error("The requestListener must be a function.");

        if(!middlewares instanceof Array)
            throw new Error("The middlewares must be an array.");

        route = this.#endpoint + (route == "/" ? "" : route);

        if(this.#routes.has(method)){
            if(this.#routes.get(method).has(route))
                throw new Error(`Route '${route}' already registered for the '${method}' method.`);
        }else
            this.#routes.set(method, new Map());
        
        this.#routes.get(method).set(route, {
            requestListener,
            middlewares
        });
    }

    get(route, requestListener, middlewares = []){
        this.#registerRoute(route, requestListener, middlewares, "GET");
    }

    post(route, requestListener, middlewares = []){
        this.#registerRoute(route, requestListener, middlewares, "POST");
    }

    put(route, requestListener, middlewares = []){
        this.#registerRoute(route, requestListener, middlewares, "PUT");
    }

    patch(route, requestListener, middlewares = []){
        this.#registerRoute(route, requestListener, middlewares, "PATCH");
    }

    delete(route, requestListener, middlewares = []){
        this.#registerRoute(route, requestListener, middlewares, "DELETE");
    }

    use(middleware){
        if(!middleware instanceof Function)
            throw new Error("The middleware must be a function.");

        this.#middlewares.push(middleware);
    }

    #defaultListenCallback(){
        console.log(`HttpServer listening on: http://127.0.0.1:${this.#port}${this.#endpoint}`);
    }

    listen(fnc = this.#defaultListenCallback){
        this.#server.listen(this.#port, "0.0.0.0", 511, fnc.bind(this));
    }

    stop(){
        this.#server.close();
    }

    static #defaultEndpointNotFoundFunction(_req, res){
        res.status(404).json({
            success: false,
            error: "404 Endpoint not found."
        });
    }

    static #addFunctionsToResponse(res){
        res.status = code => {
            res.statusCode = code;
            return res;
        }

        res.send = content => res.end(content);

        res.json = content => {
            content = JSON.stringify(content);
            res.setHeader("Content-Type", "application/json");

            res.end(content);
        };

        res.redirect = url => {
            res.writeHead(307, { "Location": url });
            res.end();
        };

        res.sendFile = path => {
            res.setHeader("Content-Type", mime.getType(path));
            res.setHeader("Content-Length", fs.statSync(path).size);

            fs.createReadStream(path).pipe(res);
        }
    }

    #requestListener(req, res){
        HttpServer.#addFunctionsToResponse(res);

        req.body = new Array();
        req.on("data", d => req.body.push(d));

        req.once("end", async () => {
            req.url = decodeURI(req.url);
            req.url = req.url.replaceAll(/\/{2,}/g, "/");
            req.url = req.url.replace(/([^\/]+)\/$/, "$1");

            req.body = Buffer.concat(req.body).toString();
            if (Object.keys(req.headers).includes("content-type") && req.headers["content-type"].startsWith("application/json"))
                req.body = JSON.parse(req.body);

            req.query = {};
            const splitedUrl = req.url.split("?");
            if(splitedUrl.length == 2){
                req.url = splitedUrl[0];

                splitedUrl[1].split("&").map(p => p.split("="))
                    .forEach((key, value) => req.query[key] = value);
            }

            for(const middleware of this.#middlewares){
                if(await middleware(req, res) == true)
                    return;
            }

            if(req.method == "OPTIONS"){
                res.status(200).end();
                return;
            }

            if(!this.#routes.has(req.method)){
                this.#endpointNotFoundFunction(req, res);
                return;
            }
            
            if(this.#routes.get(req.method).includes(req.url)){
                const route = this.#routes.get(req.method).get(req.url);

                for(const middleware of route.middlewares){
                    if(await middleware(req, res) == true)
                        return;
                }

                await route.requestListener(req, res);
                return;
            }

            const routesParts = this.#routes.get(req.method).map(r => r.slice(1).split("/"));
            const urlParts = req.url.slice(1).split("/");

            for(const routeParts of routesParts.filter(p => p.length == urlParts.length)){
                const params = {};
                for(let i = 0; i < routeParts.length; i++){
                    if(routeParts[i].startsWith(":")){
                        params[routeParts[i].slice(1)] = urlParts[i];
                    }else if(routeParts[i] != urlParts[i]){
                        break;
                    }
                    
                    if(i == routeParts.length - 1){
                        const route = this.#routes.get(req.method).get(`/${routeParts.join("/")}`);

                        for(const middleware of route.middlewares){
                            if(await middleware(req, res) == true)
                                return;
                        }

                        await route.requestListener(req, res);
                        return;
                    }
                }
            }
            
            this.#endpointNotFoundFunction(req, res);
        });
    }
}