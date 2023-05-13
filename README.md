# ExpressApi

ExpressApi est une solution alternative à Express ou d'autres frameworks similaires.
Il est à la fois simple d'utilisation et performant en plus d'être simple d'utilisation à prendre en main.
Voici un exemple d'utilisation :

## HttpServer

```js
const expressapi = require("@borane/expressapi");
const __httpServer__ = new expressapi.HttpServer(5050, "/api");

__httpServer__.get("/", async function(req, res){
    res.status(200).send("Welcome to ExpressApi");
});

__httpServer__.listen();
```

## JsonToken

```js
const expressapi = require("@borane/expressapi");
const __jwt__ = new expressapi.JsonToken("SECRET");

__jwt__.sign({ id: 0 });
__jwt__.verify("TOKEN");
```

## Mysql

```js
const expressapi = require("@borane/expressapi");
const __mysql__ = new expressapi.Mysql({
    host     : config.mysql.host,
    port     : config.mysql.port,
    user     : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database,
});

await __mysql__.query("SELECT * FROM users WHERE id = ?", [1]);
```
    

## Fonctions
    `request` : fonction pour effectuer des requêtes HTTP
    `encodeBody` : fonction pour encoder les données de la requête en JSON
    `sha512` : fonction pour générer un hash SHA-512
    `sha256` : fonction pour générer un hash SHA-256