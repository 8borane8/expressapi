
# ExpressApi

ExpressApi est une alternative simple d'utilisation et performante a express ou des frameworks similaires, il ajoute de plus pleins de fonctions utiles pour vos projets web !

## Exemple

```js
const expressapi = require("@borane/expressapi");
const config = require("./config.json");
const fs = require("node:fs");

const api = new expressapi.Server();
const mysql = new expressapi.Mysql({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
});

api.get("/", async function(req, res){
    res.status(200).send("Welcome to ExpressApi");
});

for(let route of fs.readdirSync("./routes").filter(r => r.endsWith(".js"))){
    require(`./routes/${route}`).execute(api, mysql);
}

api.listen();
```

### Classes
```
    Server =>
    Mysql =>
    JsonToken =>
    WebSocket =>
```

### Fonctions
```
    request =>
    encodeBody =>
    escapeWhiteSpaceAndNullValues =>
    sha256 =>
    sha512 =>
    b64UrlEncode =>
    b64UrlDecode =>
```
