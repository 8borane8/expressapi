const https = require("https");
const http = require("http");

module.exports = class RequestHelper{
    #headers;
    #proxy;

    constructor({ headers = {}, proxy = null } = {}){
        this.#headers = headers;
        this.#proxy = proxy;
    }

    static request({url, method, headers, body, proxy}){
        const urlObject = new URL(url);
        const protocol = proxy == undefined ? http : urlObject.protocol == "http:" ?  http : https;

        const options = {
            method: method ?? "GET",
            headers: headers ?? {}
        };

        if(proxy != undefined){
            options.hostname = proxy.host;
            options.port = proxy.port;
            options.path = url;

            options.headers["Proxy-Authorization"] = `Basic ${Buffer.from(proxy.auth).toString("base64")}`;
        }else{
            options.hostname = urlObject.hostname;
            options.port = urlObject.port != "" ? urlObject.port : urlObject.protocol == "http:" ?  80 : 443;
            options.path = urlObject.pathname + urlObject.search
        }

        return new Promise((resolve, reject) => {

            const req = protocol.request(options, (res) => {
                const body = [];
          
                res.once("error", (error) => reject(error));
                res.on("data", (chunk) => body.push(chunk));
                res.on("end", () => {
                    const responseText = Buffer.concat(body).toString();
                    const contentType = res.headers["content-type"] ?? "";

                    resolve(contentType.startsWith("application/json") ? JSON.parse(responseText) : responseText);
                });
              });
      
            req.once("error", (error) => reject(error));

            if(Object.entries(options.headers).some(o => o[0].toLocaleLowerCase() == "content-type" && o[1] == "application/json"))
              body = JSON.stringify(body);

            req.end(body);
        });
    }

    async request(options){
        options.headers = { ...this.#headers, ...(options.headers ?? {}) };

        if((options.proxy ?? null) == null && this.#proxy != null)
            options.proxy = this.#proxy;

        return await RequestHelper.request(options);
    }
}