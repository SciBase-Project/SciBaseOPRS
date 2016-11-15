var express = require('express');
var router = express.Router();
var passport = require("passport");
var request = require('request');
var https = require('https');
var dotenv = require("dotenv");
var data = {};
var data1 = {};
var bio = '';
var researcher_urls=[];
var keywords = [];
var contact_details={};
var affiliations_list = [];
var works_list = [];

dotenv.config()

router.get('/orcid/login',
  passport.authenticate('oauth2'));

router.get('/orcid/callback',
  passport.authenticate('oauth2', { failureRedirect: '/auth/orcid/login', successRedirect: '/complete-registration' }),
  function(req, res) {
    console.log("Callback route opened. code: ",req.query.code);

  });

module.exports = router;
