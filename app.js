var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var flash = require("connect-flash");
var logger = require('morgan');
var exphbs = require('express-handlebars');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var OAuth2Strategy = require('passport-oauth2').Strategy;
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
var config = require("./utils/config");
var dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config()

// Routes
var routes = require('./routes/index');
var auth = require('./routes/auth');

// Log uncaught exceptions
process.on('uncaughtException', function (error) {
  console.log(error.stack);
});

// Set up express app
var app = express();

// Mongoose database connection
var db = mongoose.connect('mongodb://localhost/oprs');

// Mongodb session store
var store = new MongoDBStore(
  {
    uri: 'mongodb://localhost:27017/oprs',
    collection: 'sessions'
  });

// Catch errors with session store
store.on('error', function (error) {
  assert.ifError(error);
  assert.ok(false);
});

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: config.sessionSecret,
  resave: true,
  saveUninitialized: true,
  maxAge: 1000 * 60 * 60 * 24 * 7,
  store: store
}));

// Passport

// configure oauth2 strategy for orcid use
var User = require("./models/user");

const oauth2 = new OAuth2Strategy(
  config.oauthConfig,
  function (req, accessToken, refreshToken, params, profile, cb) {
    
    User.findOne({ orcid: params.orcid }, (err, user) => {
      if (err) return cb(err);

      // User exists. Log them in
      if (user) {
        profile.orcid = user.orcid;
        profile.name = user.name;
        return cb(null, profile);
      
      //User does not exist. Create new user
      } else {
        let newUser = new User({ orcid: params.orcid, name: params.name });
        newUser.save(err => {
          if (err) {
            return cb(err);
          } else {
            profile.orcid = params.orcid;
            profile.name = params.name;
            profile.email = null;
            return cb(null, profile);
          }
        });
      }
    });
  }
);

passport.use(oauth2);

// Serialize & deserialize user
//-- serializeUser
passport.serializeUser((user, cb) => {
  cb(null, user.orcid);
});

//-- deserializeUser
passport.deserializeUser((id, cb) => {
  console.log("Deserialize for %s", id);
  User.findOne({ orcid: id }, (err, user) => {
    if (err) cb(err);
    cb(null, user);
  });
});

app.use(passport.initialize());
app.use(passport.session());


// Routes
app.use('/', routes);
app.use('/auth', auth);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace

if (process.env.OPRS_ENVIRONMENT === 'LOCAL') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


//attach lister to connected event
mongoose.connection.once('connected', function () {
  console.log("Connected to database")
});

module.exports = app;
