var dotenv = require("dotenv");
dotenv.config()

var env = process.env;

module.exports = {
    oauthConfig: {
        authorizationURL: env.ORCID_OAUTH_URL_AUTHORIZATION || 'https://orcid.org/oauth/authorize',
        tokenURL: env.ORCID_OAUTH_URL_TOKEN || 'https://pub.orcid.org/oauth/token',
        callbackURL: env.ORCID_OAUTH_URL_CALLBACK || 'http://localhost:3000/auth/orcid/callback',
        clientID: env.ORCID_CLIENT_ID || "APP-VO0XMDR31PKE1X93",
        clientSecret: env.ORCID_CLIENT_SECRET || "1dcaf554-25a9-4b22-b6e4-ed69ed7410b3",
        scope: env.ORCID_OAUTH_SCOPE || '/authenticate',
        passReqToCallback: true // this allows us to retrieve the orcid from the accesstoken response.
    },

    sessionSecret: env.SESSION_SECRET || "",

    hostName: env.OPRS_HOST_NAME || "oprs.pesitsouthscibase.org",

    scibaseHostName: env.SCIBASE_HOST_NAME || "pesitsouthscibase.org"

};