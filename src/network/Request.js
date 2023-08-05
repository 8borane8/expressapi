import https from "https";
import http from "http";

export class Request{
    constructor(url, options = {}){
        this.url = url;

        this.method = options.method ?? "GET";
        this.headers = options.headers ?? {};
        this.body = options.body;
    }

    send(){
        const protocol = this.url.startsWith("https://") ? https : http;

        return new Promise((resolve, reject) => {
            const req = protocol.request(this.url, {
                method: this.method,
                headers: this.headers,
                body: this.body
            }, (response) => {
                const body = [];
          
                response.once("error", (error) => {
                    reject(error);
                });
          
                response.on("data", (chunk) => {
                    body.push(chunk);
                });
          
                response.on("end", () => {
                    const responseText = Buffer.concat(body).toString();

                    if (response.headers["content-type"] != undefined && response.headers["content-type"].startsWith("application/json"))
                        resolve(JSON.parse(responseText));

                    resolve(responseText);
                });
              });
      
            req.once("error", (error) => {
                reject(error);
            });
          
            req.end(this.body);
        });
    }
}