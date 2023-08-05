import CryptoJS from "crypto-js";

export class JsonToken{
    #secret;

    constructor(secret){
        this.#secret = secret;
    }

    sign(payload){
        const jsonPayload = JSON.stringify(payload);
        const b64Payload = Buffer.from(jsonPayload).toString("base64").replace(/=+$/, "");
        const hash = CryptoJS.SHA256(b64Payload + this.#secret).toString();

        return `${b64Payload}.${hash}`;
    }

    verify(token){
        const parts = token.split(".");
        if(parts.length != 2)
            return null;

        
        if(CryptoJS.SHA256(parts[0] + this.#secret).toString() == parts[1]){
            const stringPayload = Buffer.from(parts[0], "base64").toString("utf-8");
            return JSON.parse(stringPayload);
        }

        return null;
    }
}