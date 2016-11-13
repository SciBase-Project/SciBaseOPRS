var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var User = new Schema({
    orcid: String,
    name: String,
    email: String,
    affiliation: String,
    department: String,
	created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', User); 
