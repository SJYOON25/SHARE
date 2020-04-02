//Connect to database
var mysql = require("mysql");

const db = mysql.createConnection({
    host: "127.0.0.1",
    user: "judgeplus",
    password: "",
    database: "lift_logger"
});

db.connect((err) => {
    if(err){
        console.log("DATABASE CONNECTION FAILED");
        console.log(err);
    }
});

module.exports = db;