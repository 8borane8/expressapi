# ExpressApi

ExpressApi est une alternative simple à utiliser et performante à express ou à des frameworks similaires. Il ajoute également de nombreuses fonctions utiles pour vos projets web !
Exemple d'utilisation

```js
const expressapi = require("@borane/expressapi");
const fs = require("fs");

const __httpServer__ = new expressapi.HttpServer();

__httpServer__.get("/", async function(req, res){
    res.status(200).send("Welcome to ExpressApi");
});

fs.readdirSync("./routes").filter(r => r.endsWith(".js")).forEach(function(route){
    require(`./routes/${route}`)(__httpServer__, mysql);
});

__httpServer__.listen();
```

## Classes

    `Server` : classe principale pour créer un serveur web
    `Mysql` : classe pour établir une connexion à une base de données MySQL
    `JsonToken` : classe pour générer et valider des jetons JSON
    `WebSocket` : classe pour gérer les connexions WebSocket

## Fonctions

    `request` : fonction pour effectuer des requêtes HTTP
    `encodeBody` : fonction pour encoder les données de la requête en JSON
    `isWhitespacesOrNull` : fonction pour vérifier si un objet est vide ou null
    `sha256` : fonction pour générer un hash SHA-256
    `sha512` : fonction pour générer un hash SHA-512
    `b64UrlEncode` : fonction pour encoder une chaîne en base64 pour une utilisation dans une URL
    `b64UrlDecode` : fonction pour décoder une chaîne encodée en base64 pour une utilisation dans une URL

Avec ExpressAPI, vous pouvez facilement créer un serveur web avec des fonctionnalités supplémentaires telles que la gestion de la base de données MySQL, la génération de jetons JSON et la gestion des connexions WebSocket. Il est facile à utiliser et performant, ce qui en fait un choix idéal pour vos projets web.
