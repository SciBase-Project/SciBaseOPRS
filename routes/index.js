var express = require('express');
var passport = require('passport');
var User = require('../models/user');
var ArxivArticle = require('../models/arxiv_article');
var arxiv = require("../utils/arxiv");
var router = express.Router();
var mongoose = require('mongoose');
var request = require('request');
var https = require('https');
var dotenv = require("dotenv");
var data = {};
var parsedData = {};
var bio = '';
var researcher_urls=[];
var keywords = [];
var contact_details={};
var affiliations_list = [];
var works_list = [];

dotenv.config();

router.get('/', function (req, res) {
    res.render('index', {
        title: 'SciBase OPRS',
        user: req.user,
        layout: 'main'
    });

});

router.get('/complete-registration', function (req, res) {
    let orcid = req.user.orcid;
    var get_token = {
        host: 'pub.orcid.org',
        port : 443,
        path : '/oauth/token',
        client_id : process.env.ORCID_CLIENT_ID,
        client_secret: process.env.ORCID_CLIENT_SECRET,
        scope : '/read-public',
        grant_type : 'client_credentials',
        headers : {
            'Accept' : 'application/json',
        },
    };
    var profile_token = "";
        var req_get_token = https.request(get_token, function(res) {
        res.on('data', function(d) {
            profile_token = d.access_token;
        });
    });
        req_get_token.end();
    var get_record_msg = {
            url : 'https://pub.orcid.org/v1.2/[orcid]/orcid-profile',
            method : 'GET',
            headers: {
                "Accept": 'application/orcid+json',
            },
        };
    get_record_msg.headers['Authorization'] = 'Bearer ' + profile_token;
    get_record_msg.url = get_record_msg.url.replace('[orcid]', orcid);
request(get_record_msg, function(error, response, body){
  if (error && response.statusCode != 200) {
    console.log("Error fetching data");
  }
  else{
     data  = body;

parsedData = JSON.parse(data);
   console.log("Fetched Data");
   var orcid_bio = parsedData["orcid-profile"]["orcid-bio"];
   if(parsedData["orcid-profile"]["orcid-activities"] != null)
   {
    var orcid_affiliation = parsedData["orcid-profile"]["orcid-activities"]["affiliations"];
    var orcid_works = parsedData["orcid-profile"]["orcid-activities"]["orcid-works"]["orcid-work"];
        var affiliations = orcid_affiliation["affiliation"];
    for (var i=0;i<affiliations.length; i++){
        var orcid_affiliation_obj={}
        orcid_affiliation_obj["type"] =  affiliations[i]["type"];
        orcid_affiliation_obj["department"] = affiliations[i]["department-name"];
        orcid_affiliation_obj["role"] = affiliations[i]["role-title"];
        orcid_affiliation_obj["organization"] = affiliations[i]["organization"]["name"];
        affiliations_list.push(orcid_affiliation_obj);

    }
        for (var i=0;i<orcid_works.length; i++){
            var orcid_works_obj={};
        orcid_works_obj["title"] = orcid_works[i]["work-title"]["title"]["value"];
        orcid_works_obj["journal"] = orcid_works[i]["journal-title"]["value"];
        orcid_works_obj["citation_type"] = orcid_works[i]["work-citation"]["work-citation-type"];
        orcid_works_obj["citation"] = orcid_works[i]["work-citation"]["citation"];
        orcid_works_obj["work_type"] = orcid_works[i]["work-type"];
        var pubdate = orcid_works[i]["publication-date"];
        var year = pubdate["year"]["value"];
        var month = pubdate["month"]["value"];
        var day = pubdate["day"];
        if(pubdate != null){
            if(day == null){
            var date = 'dd'+ '-' + month + '-' + year;
        }
        else if(month == null){
            var date = 'dd' + '-' + 'mm' + '-' + year;
        }
        else{
            var date = day + '-' + month + '-' + year;
        }
        }
        

        orcid_works_obj["pub_date"] = date;
        var orcid_contributors= orcid_works[i]["work-contributors"]["contributor"];
        
        var orcid_contributors_list=[]
        for(var j=0;j<orcid_contributors.length;j++){
            var orcid_contributors_obj={};
            orcid_contributors_obj["contributor_name"] = orcid_contributors[j]["credit-name"]["value"];
            orcid_contributors_obj["contributor_role"] = orcid_contributors[j]["contributor-attributes"]["contributor-role"];
            orcid_contributors_list.push(orcid_contributors_obj);
        }
        works_list.push(orcid_works_obj);
        works_list.push(orcid_contributors_list);

    }
}
    bio = orcid_bio["biography"];
    researcher_urls = orcid_bio["researcher-urls"];
    keywords = orcid_bio["keywords"];
    contact_details = orcid_bio["contact-details"];
    console.log(bio);
    console.log(researcher_urls);
    console.log(keywords);
    console.log(contact_details);
    console.log(affiliations_list);
    console.log(works_list);
    User.findOneAndUpdate({ orcid: req.user.orcid }, { bio: bio, researcher_urls : researcher_urls, keywords : keywords, contact_details : contact_details, affiliations : affiliations_list, works : works_list }, (err, user) => {
        if(err) next(err);
        console.log("Data added");
    });
}
});
    
    if (req.user.email) {
        res.redirect('/');
    } else {
        res.render('complete-registration', {
            title: 'Complete Registration | SciBase OPRS',
            user: req.user,
        });
    }
});

router.post('/complete-registration', function (req, res) {
    var email_id = req.body.email_id;

    User.findOneAndUpdate({ orcid: req.user.orcid }, { email: email_id }, (err, user) => {
        if(err) next(err);
        console.log("Email updated");
        res.redirect('/');
    });
});

router.get('/login', function (req, res) {
    res.render('login', {
        title: "Login - SciBase | OPRS",
        user: req.user,
        message: req.flash('error'),
    });
});

router.get('/logout', function (req, res, next) {
    req.logout();
    req.session.save(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

router.get('/getSubCategories', function (req, res, next) {
    var cat = req.query.category_id;

    res.send(arxiv.category_subcategory_mapping[cat]);
});

router.get('/ping', function (req, res) {
    res.status(200).send("pong!");
});

router.get('/public_articles/view/:article_id', function (req, res) {
    var context = {};
    var article_id = req.params.article_id;
    console.log("Article id", article_id);

    ArxivArticle.findOneAndUpdate({
        arxiv_id: article_id
    }, {
            $inc: {
                views: 1
            }
        }, function (err, article) {
            if (err) next(err);

            if (article) {
                console.log("Number of views:", article.views);

                // console.log("Found article\n", article);
                context.title = article.title;
                context.author_names = article.authors.map(function (a) {
                    return a.name;
                }).join(", ");
                context.publish_date = article.published_at.toDateString();
                context.arxiv_url = article.arxiv_url;
                context.pdf_url = article.pdf_url;
                context.arxiv_comments = article.arxiv_comments;
                context.category_name = article.arxiv_category;
                context.summary = article.summary;
                context.comments = article.comments.map(function (c) {
                    c.created_at = c.created_at.toDateString();
                    return c;
                });
                context.user = req.user;
                context.isAuthenticated = req.isAuthenticated();
                res.render('arxiv_article', context);
            } else {
                arxiv.fetchArticle(article_id, function () {
                    res.redirect("/public_articles/view/" + article_id);
                });
            }
        }); // findOne ends
});

router.post('/public_articles/view/:article_id', function (req, res) {
    // TODO: This needs to handle adding of comments via POST request
    var context = {};
    var article_id = req.params.article_id;
    console.log("Article id:", article_id);

    if (req.isAuthenticated()) {
        // User is logged in

        var newComment = {
            user: req.user._id,
            orcid: req.user.orcid,
            name: req.user.name,
            text: req.body.message,
            created_at: new Date()
        };
        console.log("New comment:", newComment);

        ArxivArticle.findOne({
            arxiv_id: article_id
        }, function (err, article) {
            if (err) next(err);

            if (article) {
                if (typeof article.comments == 'object') {
                    article.comments.push(newComment);
                } else {
                    article.comments = [newComment];
                }

                article.last_commented_at = Date.now();
                article.save();

                context.title = article.title;
                context.author_names = article.authors.map(function (a) {
                    return a.name;
                }).join(", ");
                context.publish_date = article.published_at.toDateString();
                context.arxiv_url = article.arxiv_url;
                context.pdf_url = article.pdf_url;
                context.arxiv_comments = article.arxiv_comments;
                context.category_name = article.arxiv_category;
                context.summary = article.summary;
                context.comments = article.comments.map(function (c) {
                    c.created_at = c.created_at.toDateString();
                    return c;
                });
                context.user = req.user;
                context.isAuthenticated = req.isAuthenticated();
                res.render('arxiv_article', context);
            }
            else {
                res.status(404).send("Article not found");
            }
        });
    } else {
        // User is not logged in
        res.redirect("/login");
    }
});

router.get("/public_articles", function (req, res) {
    var context = {};
    var popular_articles = [], recently_reviewed_articles = [];

    // List of categories for dropdown
    context['categories'] = arxiv.categories;

    context.user = req.user;
    context.isAuthenticated = req.isAuthenticated();

    ArxivArticle.find({}).sort('-views').limit(10).exec(function (err, results) {
        if (!err) {
            console.log("Popular articles:", results);
            ArxivArticle.find({}).sort('-last_commented_at').limit(10).exec(function (err1, results1) {
                if (!err1) {
                    console.log("Recently reviewed articles:", results1);
                    for (var i = 0; i < results.length; i++) {
                        var temp = {};
                        temp.id = results[i].arxiv_id;
                        temp.title = results[i].title;
                        temp.author_names = results[i].authors.map(function (a) {
                            return a.name;
                        }).join(", ");
                        temp.publish_date = results[i].published_at.toDateString();
                        popular_articles.push(temp);
                    }

                    for (i = 0; i < results1.length; i++) {
                        var temp = {};
                        temp.id = results1[i].arxiv_id;
                        temp.title = results1[i].title;
                        recently_reviewed_articles.push(temp);
                    }

                    console.log("\n\nPop Art:", popular_articles);
                    console.log("\n\nRec Art:", recently_reviewed_articles);
                    context.popular_articles = popular_articles;
                    context.recently_reviewed_articles = recently_reviewed_articles;

                    res.render("public_articles", context);
                } else {
                    console.log("Error getting recently reviewed articles.");
                }
            });
        } else {
            console.log("Error getting popular articles.");
        }
    });
});

router.post("/public_articles", function (req, res) {
    var context = {};
    var search_term = req.body.search_term;

    // List of categories for dropdown
    context['categories'] = arxiv.categories;
    context.user = req.user;
    context.isAuthenticated = req.isAuthenticated();

    res.redirect('/public_articles/search?q=' + search_term.replace(/ /g, '+') + '&p=1')
});

router.get("/public_articles/search", function (req, res) {
    var context = {};
    var search_term, base_url, page = 1, cat = null, subCat = null, author = null;
    var sortBy = null, sortOrder = null;

    // List of categories for dropdown
    context['categories'] = arxiv.categories;

    context.user = req.user;
    context.isAuthenticated = req.isAuthenticated();

    // Base URL for constructing URL of the different pages of search results
    base_url = "/public_articles/search?";

    if (req.query.q) {
        base_url += "q=" + req.query.q;
        search_term = req.query.q.replace(/\+/g, ' ');
        // search_term = decodeURIComponent(search_term);
    }

    if (req.query.a) {
        base_url += "&a=" + req.query.a;
        author = decodeURIComponent(req.query.a);
        author = author.replace(/\+/g, ' ');
    }

    if (req.query.cat) {
        base_url += "&cat=" + req.query.cat;
        cat = decodeURIComponent(req.query.cat);
    }

    if (req.query.subcat) {
        base_url += "&subcat=" + req.query.subcat;
        subCat = decodeURIComponent(req.query.subcat);
    }

    if (req.query.sort_by) {
        base_url += "&sort_by=" + req.query.sort_by;
        sortBy = decodeURIComponent(req.query.sort_by);
    }

    if (req.query.order) {
        base_url += "&order=" + req.query.order;
        sortOrder = decodeURIComponent(req.query.order);
    }

    if (req.query.p)
        page = parseInt(req.query.p);

    var arxiv_query = 'all:"' + search_term + '"';

    if (cat && subCat) {
        arxiv_query += " cat:" + cat;

        if (subCat)
            arxiv_query += "." + subCat;
    }

    if (author)
        arxiv_query += ' au:"' + author + '"';

    if (sortBy) {
        if (sortBy === "submitted_date")
            arxiv_query += "&sortBy=submittedDate";
        else if (sortBy === "updated_date")
            arxiv_query += "&sortBy=lastUpdatedDate";
        else if (sortBy === "relevance")
            arxiv_query += "&sortBy=relevance";

        if (sortOrder) {
            if (sortOrder === "asc")
                arxiv_query += "&sortOrder=ascending";
            else if (sortOrder === "desc")
                arxiv_query += "&sortOrder=descending";
        }
    }


    console.log("Search term:", search_term, "Page:", page);

    arxiv.searchArticles(arxiv_query, (page - 1) * 10, function (result) {
        console.log("Search result", result);
        context.count = result.count;
        context.search_results = result.results;
        if (search_term) {
            context.search_term = search_term;
            context.search_term_safe = search_term.replace(' ', '+');
        }
        context.page_number = page;
        context.pages = [];
        context.previous = context.page_number === 1 ? false : true;
        context.next = total_pages - context.page_number >= 10 ? false : true;
        context.previous_page = context.page_number - 1;
        context.previous_page_url = base_url + "&p=" + context.previous_page;
        context.next_page = context.page_number + 1;
        context.next_page_url = base_url + "&p=" + context.next_page;
        var total_pages = context.count / 10;
        if (total_pages - context.page_number + 1 >= 10) {
            for (i = context.page_number; i < context.page_number + 10; i++) {
                context.pages.push({
                    number: i,
                    link: base_url + "&p=" + i
                });
            }
        }
        else {
            for (i = context.page_number; i < total_pages - context.page_number + 1; i++) {
                context.pages.push({
                    number: i,
                    link: base_url + "&p=" + i
                });
            }
        }
        res.render("public_articles", context);
    });
});

module.exports = router;
