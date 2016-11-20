var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var User = new Schema({
    orcid: String,
    name: String,
    email: String,
	created_at: { type: Date, default: Date.now },
	bio: String,
 	researcher_urls: Schema.Types.Mixed,
	keywords: [Schema.Types.Mixed],
	contact_details: Schema.Types.Mixed,
	affiliations: [Schema.Types.Mixed],
	works: [Schema.Types.Mixed],
	funding: [Schema.Types.Mixed],
	fetched_orcid_data: {type: Boolean, default: false},
});

module.exports = mongoose.model('User', User); 
