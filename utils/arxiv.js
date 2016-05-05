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
                            console.log("JSON:\n",JSON.stringify(article),"\n");
                            result = {
                                title: article.title,
                                summary: article.summary,
                                arxiv_url: article.id,
                                arxiv_id: article.id.split('/').pop().split('v')[0],
                                published_at: new Date(article.published),
                                arxiv_category: article['arxiv:primary_category'].$.term,
                                authors: [],
                                comments: []
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
                            if (!Array.isArray(article.author))
                            {
                                temp = {};
                                temp.name = article.author.name;
                                if (article.author.hasOwnProperty('arxiv:affiliation') && article.author['arxiv:affiliation']._)
                                temp.affiliation = article.author['arxiv:affiliation']._;
                                result.authors.push(temp);
                            } else {
                                for (var j in article.author) {
                                    temp = {};
                                    temp.name = article.author[j].name;
                                    if (article.author[j].hasOwnProperty('arxiv:affiliation') && article.author[j]['arxiv:affiliation']._)
                                    temp.affiliation = article.author[j]['arxiv:affiliation']._;
                                    result.authors.push(temp);
                                }
                            }

                            console.log("Mongo:\n",JSON.stringify(result),"\n");

                            //Push to database
                            var newArticle = new ArxivArticle(result);
                            newArticle.save(function(err){
                                if(err)
                                {
                                    console.log("Error saving article\n",err);
                                }
                            });
                            console.log("Inserted article to db");
                            console.log(newArticle);

                        } else {
                            console.log("XML parsing error", err1);
                        }
                        callback();
                    }); // xml2js.parseString ends
                } else {
                    console.log("Request error", err);
                }

            }); // request ends
        }, // fetchArticle ends

    searchArticles: function(search_term, start, callback) {
        var search_url = "http://export.arxiv.org/api/query?search_query=all:" + search_term + "&start=" + start;
        var results = [];
        var result_object = {};

        request(search_url, function(err, resp, body) {
            console.log("Resp",resp.statusCode);
            if (!err && resp.statusCode == 200) {
                console.log("Request successful");
                xml = body;

                xml2js.parseString(xml, {
                    explicitArray: false
                }, function(err1, res) {
                    if(!err1) {
                        var articles = res.feed.entry;
                        result_object.count = parseInt(res.feed['opensearch:totalResults']._);

                        for(var i in articles)
                        {
                            var temp = {};
                            temp.title = articles[i].title.replace('\n','');
                            temp.id = articles[i].id.split('/').pop().split('v')[0];
                            temp.published_at = new Date(articles[i].published).toDateString();
                            console.log("Author", articles[i].author);
                            if (!Array.isArray(articles[i].author))
                            {
                                temp.authors = articles[i].author.name;
                            } else {
                                temp.authors = articles[i].author.map(function(a) {
                                    return a.name;
                                }).join(', ');
                            }

                            results.push(temp);
                            result_object.results = results;
                        }

                    } else {
                        console.log("XML parsing error", err1);
                    }
                    callback(result_object);
                }); // xml2js.parseString ends

            } else {
                console.log("Request error", err);
            }
        }); // request ends

    } // searchArticles
};
