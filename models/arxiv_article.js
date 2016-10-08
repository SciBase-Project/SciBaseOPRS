var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ArxivArticle = new Schema({
    article_id: Number,
    arxiv_id: {type: String, unique: true},
    arxiv_url: String,
    published_at: Date,
    updated_at: Date,
    title: String,
    summary: String,
    authors: [{name: String, affiliation: String}],
    comments: [{name: String, text: String, email: String, created_at: { type: Date } }],
    arxiv_comments: String,
    arxiv_category: String,
    pdf_url: String,
    views: {type: Number, default: 0},
    last_commented_at: {type: Date, default: Date.now}
}, {
    timestamps: true
});

module.exports = mongoose.model('ArxivArticle', ArxivArticle);
