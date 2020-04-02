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
    ssn = req.session;
    if(ssn.user){
        // retrieve data
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
                    res.render('index', {user: ssn.user, weightUnit: ssn.weightUnit, bodyweight: ssn.bodyWeight, datas: datas, dates: dates});
                }else{
                    res.render('index', {user: ssn.user, weightUnit: ssn.weightUnit});
                }
            }
        });
    }else{
        ssn.weightUnit = 0;
        res.render('index', {weightUnit: ssn.weightUnit});
    }
});

app.get('/about', function(req, res) {
    res.render('about', {user: req.session.user});
});

app.get('/friends', function(req, res) {
    res.render('friends', {user: req.session.user});
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
        res.render('login');
    });
});

app.get('/privacy', function(req, res) {
    res.render('privacy', {user: req.session.user});
});

app.get('/suggestions', function(req, res) {
    res.render('suggestions', {user: req.session.user});
});

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

// account login
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
        var query = 'SELECT hash, weight_unit, bodyweight FROM user_data WHERE username=?';
        db.query(query, [uname], function (err, result) {
            if(err){
                console.error(err);
            }else{
                //Authenticate user
                if(result.length > 0){
                    var sha256 = require('js-sha256');
                    var hash = result[0].hash;
                    req.session.weightUnit = parseInt(result[0].weight_unit[0]);
                    
                    if(hash == sha256(pswrd)){
                        req.session.user = uname;
                        req.session.bodyWeight = result[0].bodyweight;
                        
                        res.redirect("/");
                    }else{
                        res.render('login', {loginMessage: 'inc_pswrd'});
                    }
                }else{
                    res.render('login', {loginMessage: 'inv_uname'});
                }
            }
        });
    });
});

// input lifts log
app.post('/', function(req, res) {
    // if user not logged in, don't do anything
    if(!req.session.user){
        return;
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        var lines = body.split('&');
        var unit = lines[0].split("=")[1] === 'true' ? 1 : 0;
        var bw = lines[1].split("=")[1];

        req.session.weightUnit = unit;
        req.session.bodyWeight = bw;
        
        // insert/update lift data
        var data = "";
        for(var i = 2; i < lines.length; i += 3){ // process each lift input (set of 3 input lines)
            var vals = (new Array(3)).fill("");
            // check that all 3 inputs for a lift are valid. eliminate all 3 if any are invalid.
            var valid = true;
            for(var j = 0; j < 3; j++){
                vals[j] = lines[i + j].split("=")[1];
                if(vals[j] == ""){ // input is not filled
                    valid = false;
                    break;
                }
            }
            // concatenate
            if(valid){ // only include values if all 3 for a lift (sets, reps, weight) are valid
                for(var j = 0; j < 3; j++){
                    data += vals[j] + "/";
                }
            }else{ // blank values for all 3 lift params
                data += "///"
            }
        }
        data += unit; // tack on weight unit
        
        // update weight unit preference
        var query = 'UPDATE user_data SET weight_unit=?, bodyweight=? WHERE username=?';
        db.query(query, [unit, req.session.bodyWeight, req.session.user], function (err, result) {
            if(err){
                console.error(err);
            }
        });

        // parse date
        var currDate = new Date();
        var date = `${currDate.getFullYear()}-${currDate.getMonth() + 1}-${currDate.getDate()}`;
        
        // update/create lift entry
        query = 'SELECT user FROM lift_data WHERE user=? AND date=?';
        db.query(query, [req.session.user, date], function (err, result) {
            if(err){
                console.error(err);
            }else{
                // update
                if(result.length > 0){
                    query = 'UPDATE lift_data SET data=? WHERE user=? AND date=?';
                // insert
                }else{
                    query = 'INSERT INTO lift_data (data, user, date) VALUES (?, ?, ?)';
                }

                db.query(query, [data, req.session.user, date], function (err, result) {
                    if(err){
                        console.error(err);
                    }else{
                        res.redirect('/');
                    }
                });
            }
        });
    });
});

const port = 3000;
app.listen(port);

console.log(`Listening on port ${port}`);