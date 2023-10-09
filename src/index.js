const { RequestHelper } = require("./network/RequestHelper.js");
const { HttpServer } = require("./network/HttpServer.js");
const { JsonToken } = require("./utils/JsonToken.js");
const { Request } = require("./network/Request.js");
const { Mysql } = require("./utils/Mysql.js");
const { SHA256, SHA512 } = require("crypto-js");

function sha256(payload){
    return SHA256(payload).toString();
};

function sha512(payload){
    return SHA512(payload).toString();
};

module.exports = {
    sha256,
    sha512,

    RequestHelper,
    HttpServer,
    JsonToken,
    Request,
    Mysql
}