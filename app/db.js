//Connect to database
var mysql = require("mysql");

const db = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "SHARE"
});

db.connect((err) => {
    if(err){
        console.log("DATABASE CONNECTION FAILED");
        console.log(err);
    }
});

module.exports = db;