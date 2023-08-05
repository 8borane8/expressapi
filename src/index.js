import { HttpServer } from "./network/HttpServer.js";
import { JsonToken } from "./utils/JsonToken.js";
import { Request } from "./network/Request.js";
import { Mysql } from "./utils/Mysql.js";
import CryptoJS from "crypto-js";

export { HttpServer, JsonToken, Request, Mysql };

export function sha256(payload){
    return CryptoJS.SHA256(payload).toString();
};

export function sha512(payload){
    return CryptoJS.SHA512(payload).toString();
};