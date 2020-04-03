const express = require('express');
const session  = require('express-session');
const db = require('./db');                     // database connection setup
const path = require('path');

var app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret: "supersecretsquirrel"})); // change this

// GET home/index page
app.get('/', function(req, res) {
    // check if user is logged in
    if(req.session.user){
        // retrieve data
        /*
        var query = 'SELECT data, date FROM SHARE WHERE user=? ORDER BY date ASC';
        db.query(query, [req.session.user], function (err, result) {
            if(err){
                console.error(err);
            }else{
                if(result.length > 0){
                    var datas = "";
                    var dates = "";
                    for(var i = 0; i < result.length; i++){
                        datas += result[i].data;
                        dates += result[i].date;
                        if(i < result.length - 1){
                            datas += "|";
                            dates += "|";
                        }
                    }
                    res.render('index', {user: req.session.user});
                }else{
                    res.render('index', {user: req.session.user});
                }
            }
        });
        */
    }else{
        res.redirect('/login');
    }
});

app.get('/login', function(req, res) {
    req.session.destroy(function(err){
        res.render('login');
    });
});

app.get('/register', function(req, res) {
    req.session.destroy(function(err){
        res.render('register');
    });
});

app.get('/logout', function(req, res) {
    req.session.destroy(function(err){
        res.redirect('/login');
    });
});

app.get('/privacy', function(req, res) {
    res.render('privacy', {user: req.session.user});
});

app.get('/suggestions', function(req, res) {
    res.render('suggestions', {user: req.session.user});
});

/*
// account registration
app.post('/register', function(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        // parse username and password
        var lines = body.split('\n');
        var uname = lines[0].split('=')[1].trim();
        var pswrd = lines[1].split('=')[1].trim();
        var email = lines[2].split('=')[1].trim();

        // check validity of username
        if(uname.includes(" ")){
            res.render('register', {regMessage: 'invalid_uname', inputs: [uname, pswrd, email].join("/")});
            return;
        }

        // check if username is taken
        var query = 'SELECT email FROM user_data WHERE username=?';
        db.query(query, [uname], function (err, result) {
            if(err){
                console.error(err);
            }else{
                if(result.length > 0){
                    res.render('register', {regMessage: 'uname_taken', inputs: [uname, pswrd, email].join("/")});
                }else{
                    var sha256 = require('js-sha256');
                    var hash = sha256(pswrd);
                    query = 'INSERT INTO user_data (username, hash, email) VALUES (?, ?, ?)';
                    db.query(query, [uname, hash, email], function(err, result) {
                        res.render('register', {regMessage: 'verify', inputs: [uname, pswrd, email].join("/")});
                    });
                }
            }
        });
    });
});
*/

// account login submit
app.post('/login', function(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        // parse username and password
        var lines = body.split('&');
        var uname = lines[0].split('=')[1];
        var pswrd = lines[1].split('=')[1];

        // validate credentials
        var query = 'SELECT hash FROM user_data WHERE username=?';
        db.query(query, [uname], function (err, result) {
            if(err){
                console.error(err);
            }else{
                //Authenticate user
                if(result.length > 0){
                    var sha256 = require('js-sha256');
                    var hash = result[0].hash;
                    
                    if(hash == sha256(pswrd)){
                        req.session.user = uname;
                        res.render('index', {user: req.session.user});
                    }else{
                        res.render('login', {loginMessage: 'inc_pswrd', unameVal: uname});
                    }
                }else{
                    res.render('login', {loginMessage: 'inv_uname', unameVal: uname});
                }
            }
        });
    });
});

const port = 3000;
app.listen(port);

console.log(`Listening on port ${port}`);