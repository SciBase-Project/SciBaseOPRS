var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ArxivArticle = new Schema({
    article_id: Number,
    arxiv_id: {type: String, unique: true},
    published_at: Date,
    title: String,
    summary: String,
    authors: [{name: String, affiliation: String}],
    comments: [{name: String, text: String, email: String, created_at: { type: Date, default: Date.now } }],
    arxiv_comments: String,
    arxiv_category: String,
    pdf_url: String,
	created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ArxivArticle', ArxivArticle);
