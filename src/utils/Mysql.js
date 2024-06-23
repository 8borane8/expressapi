const mysql = require("mysql");

module.exports = class Mysql {
    #conn;

    constructor(options) {
        this.#conn = mysql.createConnection(options);
        this.#conn.connect();

        setInterval(this.#saveConn.bind(this), 10000);
    }

    #saveConn() {
        this.#conn.query("SELECT 1");
    }

    query(query, options = []) {
        return new Promise((resolve, reject) =>
            this.#conn.query(query, options, (err, res) => err ? reject(err) : resolve(res))
        );
    }
}