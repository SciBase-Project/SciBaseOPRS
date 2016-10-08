var request = require("request");
var xml2js = require("xml2js");
var ArxivArticle = require("../models/arxiv_article");

module.exports = {
    fetchArticle: function(id, callback) {
            var xml, article, result;
            var arxiv_url = "http://export.arxiv.org/api/query?id_list=";

            if(id.indexOf('_') == -1)
                arxiv_url += id;
            else
                arxiv_url += id.replace('_','/')

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

                            // Check if the article has old identifier format
                            var arxiv_id_regex_match = article.id.match(/http[s]?\:\/\/arxiv\.org\/abs\/([a-zA-Z\-\.]+)\/(\d{7,})(v\d+)?/);
                            var new_article_arxiv_id;

                            if (arxiv_id_regex_match) {
                                new_article_arxiv_id = arxiv_id_regex_match[1] + '_' + arxiv_id_regex_match[2];
                            } else {
                                new_article_arxiv_id = article.id.split('/').pop().split('v')[0];
                            }

                            result = {
                                title: article.title,
                                arxiv_id: new_article_arxiv_id,
                                summary: article.summary,
                                arxiv_url: article.id,
                                published_at: new Date(article.published),
                                updated_at: new Date(article.updated),
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
        var search_url = "http://export.arxiv.org/api/query?search_query=" + search_term + "&start=" + start;
        var results = [];
        var result_object = {};

        request(search_url, function(err, resp, body) {
            if (!err && resp.statusCode == 200) {
                console.log("Request successful");
                xml = body;

                xml2js.parseString(xml, {
                    explicitArray: false
                }, function(err1, res) {
                    if(!err1) {
                        var articles = res.feed.entry;
                        result_object.count = parseInt(res.feed['opensearch:totalResults']._);
                    
                        if(!Array.isArray(articles)) {
                            var temp = {}, temp_id, arxiv_id_regex_match;
                            temp_id = articles.id;
                            arxiv_id_regex_match = temp_id.match(/http[s]?\:\/\/arxiv\.org\/abs\/([a-zA-Z\-\.]+)\/(\d{7,})(v\d+)?/);

                            if (arxiv_id_regex_match) {
                                temp.id = arxiv_id_regex_match[1] + '_' + arxiv_id_regex_match[2];
                            } else {
                                temp.id = articles.id.split('/').pop().split('v')[0];
                            }

                            temp.title = articles.title.replace('\n','');
                            temp.published_at = new Date(articles.published).toDateString();
                            if (!Array.isArray(articles.author))
                            {
                                temp.authors = articles.author.name;
                            } else {
                                temp.authors = articles.author.map(function(a) {
                                    return a.name;
                                }).join(', ');
                            }

                            results.push(temp);
                            result_object.results = results;
                        } else {
                            for(var i in articles) {
                                var temp = {}, temp_id, arxiv_id_regex_match;
                                temp_id = articles[i].id;
                                arxiv_id_regex_match = temp_id.match(/http[s]?\:\/\/arxiv\.org\/abs\/([a-zA-Z\-\.]+)\/(\d{7,})(v\d+)?/);

                                if (arxiv_id_regex_match) {
                                    temp.id = arxiv_id_regex_match[1] + '_' + arxiv_id_regex_match[2];
                                } else {
                                    temp.id = articles[i].id.split('/').pop().split('v')[0];
                                }

                                temp.title = articles[i].title.replace('\n','');
                                temp.published_at = new Date(articles[i].published).toDateString();
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
