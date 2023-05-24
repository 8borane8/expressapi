const CryptoJS = require("crypto-js");

class JsonToken{
    constructor(secret){
        this.secret = secret;
    }

    sign(payload){
        let encoded_payload = CryptoJS.enc.Utf8.parse(JSON.stringify(payload));
        encoded_payload = CryptoJS.enc.Base64url.stringify(encoded_payload);

        return `${encoded_payload}.${CryptoJS.SHA256(encoded_payload + this.secret)}`;
    }

    verify(token){
        try{
            let decoded_token = CryptoJS.enc.Base64url.parse(token.split(".")[0]);
            decoded_token = JSON.parse(CryptoJS.enc.Utf8.stringify(decoded_token));

            if(CryptoJS.SHA256(token.split(".")[0] + this.secret) == token.split(".")[1]){
                return decoded_token;
            }
        }catch{}

        return null;
    }
}

module.exports.JsonToken = JsonToken;