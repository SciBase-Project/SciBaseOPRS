var request = require("request");
var xml2js = require("xml2js");
var ArxivArticle = require("../models/arxiv_article");

module.exports = {
    fetchArticle: function(id, callback) {
            var xml, article, result;
            var arxiv_url = "http://export.arxiv.org/api/query?id_list=" + id;

            request(arxiv_url, function(err, resp, body) {
                if (!err && resp.statusCode == 200) {
                    console.log("Request successful");
                    xml = body;

                    xml2js.parseString(xml, {
                        explicitArray: false
                    }, function(err1, res) {
                        if (!err1) {
                            console.log("Parsed XML to json");
                            article = res.feed.entry;
                            // console.log("JSON\n",JSON.stringify(article));
                            result = {
                                title: article.title,
                                abstract: article.summary,
                                arxiv_id: article.id.split('/').pop().split('v')[0],
                                published_at: new Date(article.published),
                                arxiv_category: article['arxiv:primary_category'].$.term,
                                authors: []
                            };
                            if (article['arxiv:comment'])
                                result.arxiv_comments = article['arxiv:comment']._;
                            else
                                result.arxiv_comments = null;

                            for (var i in article.link) {
                                if (article.link[i].$ && article.link[i].$.title === 'pdf') {
                                    result.pdf_url = article.link[i].$.href;
                                }
                            }
                            for (var j in article.author) {
                                temp = {};
                                temp.name = article.author[j].name;
                                if (article.author[i]['arxiv:affiliation'] && article.author[i]['arxiv:affiliation']._)
                                    temp.affiliation = article.author[i]['arxiv:affiliation']._;
                                result.authors.push(temp);
                            }

                            //Push to database
                            var newArticle = new ArxivArticle(result);
                            console.log("Inserted article to db");
                            console.log(newArticle);

                        } else {
                            console.log("XML parsing error", err1);
                        }
                        callback();
                    }); //xml2js.parseString ends
                } else {
                    console.log("Request error", err);
                }

            }); // request ends
        } // fetchArticle ends
};
