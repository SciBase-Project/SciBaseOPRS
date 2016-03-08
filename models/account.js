var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose'),
    bcrypt = require('bcrypt-nodejs');

var Account = new Schema({
    username: String,
    password: String,
    first_name: String,
    last_name: String,
    email: String,
    university: String,
    department: String,
	created_at: { type: Date, default: Date.now },
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account); 
