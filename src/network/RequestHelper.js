const https = require("https");
const http = require("http");

class RequestHelper{
    #headers;
    #proxy;

    constructor({ headers = {}, proxy = null } = {}){
        this.#headers = headers;
        this.#proxy = proxy;
    }

    static request({url, method, headers, body, proxy}){
        const protocol = proxy != undefined ? http : url.startsWith("https://") ? https : http;

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
            options.hostname = url.match(/https?:\/\/([\w.-]+)/)[1];
            options.port = url.startsWith("https://") ? 443 : 80;
            options.path = url.match(/https?:\/\/[\w.-]+(\/[\w.\/-]*)?/)[1] ?? "/";
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

module.exports.RequestHelper = RequestHelper;