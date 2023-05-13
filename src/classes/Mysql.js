const mysql = require("mysql");

class Mysql{
    constructor(options){
        this.conn = mysql.createConnection(options);

        this.conn.connect(); 
        setInterval(this.saveConn.bind(this), 10000);
    }

    query(sql, options){
        return new Promise(function(resolve, reject){
            this.conn.query(sql, options, function(err, results){
                return err ? reject(err) : resolve(results);
            });
        });
    }

    saveConn(){
        this.conn.query("SELECT 1", function(){});
    }
}

module.exports.Mysql = Mysql;