# ExpressApi

ExpressApi est une solution alternative à Express ou d'autres frameworks similaires.
Il est à la fois simple d'utilisation et performant en plus d'être simple d'utilisation à prendre en main.
Voici un exemple d'utilisation :

## HttpServer

```js
const expressapi = require("@borane/expressapi");
const httpServer = new expressapi.HttpServer(5050, "/api");

httpServer.get("/", async function(_req, res){
    res.status(200).send("Welcome to ExpressApi");
});

httpServer.listen();
```

## RequestHelper

```js
const expressapi = require("@borane/expressapi");
const response = await new expressapi.RequestHelper.request({
    url: "http://ip-api.com/json",

    proxy: {
        auth: "<user>:<pass>", // null
        protocal: "http",
        host: "<ip>",
        port: 80
    }
});

console.log(response);
```

## JsonToken

```js
const expressapi = require("@borane/expressapi");
const jsonToken = new expressapi.JsonToken("SECRET");

jsonToken.sign({ id: 0 });
jsonToken.verify("TOKEN");
```

## Mysql

```js
const expressapi = require("@borane/expressapi");
const mysql = new expressapi.Mysql({
    host     : config.mysql.host,
    port     : config.mysql.port,
    user     : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database,
});

await mysql.query("SELECT * FROM users WHERE id = ?", [1]);
```
    
## Fonctions
    `sha256` : fonction pour générer un hash SHA-256
    `sha512` : fonction pour générer un hash SHA-512