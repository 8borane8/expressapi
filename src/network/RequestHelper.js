const https = require("https");
const http = require("http");

module.exports = class RequestHelper{
    #headers;
    #proxy;

    constructor({ headers = {}, proxy = null } = {}) {
        this.#headers = headers;
        this.#proxy = proxy;
    }

    static request({ url, method = "GET", headers = {}, body = null, proxy = null }) {
        const urlObject = new URL(url);
        const protocol = (proxy == null ? urlObject.protocol == "http:" : proxy.protocol == "http") ? http : https;

        const options = {
            method,
            headers,
            hostname: proxy == null ? urlObject.hostname : proxy.hostname,
            port: proxy == null ? (urlObject.port == "" ? undefined : urlObject.port) : proxy.port,
            path: proxy == null ? urlObject.pathname + urlObject.search : url,
        };

        if(proxy != null && proxy.auth != null)
            options.headers["Proxy-Authorization"] = `Basic ${Buffer.from(proxy.auth).toString("base64")}`;

        if(body != null){
            const contentType = Object.entries(headers).find(o => o[0].toLowerCase() == "content-type") ?? null;

            if(contentType != null && contentType[1].startsWith("application/json"))
                body = JSON.stringify(body);

            options.headers["Content-Length"] = body.length;
        }

        return new Promise((resolve, reject) => {
            const req = protocol.request(options, res => {
                const chunks = new Array();

                res.on("data", chunk => chunks.push(chunk));
                res.once("error", err => reject(err));

                res.on("end", () => {
                    const responseText = Buffer.concat(chunks).toString();
                    const contentType = res.headers["content-type"] ?? "";

                    resolve(contentType.startsWith("application/json") ? JSON.parse(responseText) : responseText);
                });                
            });

            req.once("error", err => reject(err));
            req.end(body);
        });
    }

    async request(options) {
        options.headers = { ...this.#headers, ...(options.headers || {}) };

        if(!options.proxy && this.#proxy)
            options.proxy = this.#proxy;

        return await RequestHelper.request(options);
    }
};