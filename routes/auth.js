var express = require('express');
var router = express.Router();
var passport = require("passport");


router.get('/orcid/login',
  passport.authenticate('oauth2'));

router.get('/orcid/callback',
  passport.authenticate('oauth2', { failureRedirect: '/auth/orcid/login', successRedirect: '/complete-registration' }),
  function(req, res) {
    console.log("Callback route opened. code: ",req.query.code);

  });

module.exports = router;
