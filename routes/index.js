var express = require('express');
var passport = require('passport');
var User = require('../models/user');
var ArxivArticle = require('../models/arxiv_article');
var arxiv = require("../utils/arxiv");
var orcidUtil = require("../utils/orcid");
var router = express.Router();
var mongoose = require('mongoose');
var request = require('request');
var https = require('https');
var dotenv = require("dotenv");

dotenv.config();

router.get('/', function(req, res) {
    res.render('index', {
        title: 'SciBase OPRS',
        user: req.user,
        layout: 'main'
    });

});

router.get('/complete-registration', function(req, res) {
    let orcid = req.user.orcid;

    
    User.findOne({
        orcid: orcid
    }, function(err, user) {
        if(err) next(err);

        if (user.fetched_orcid_data) {
        // User's details have been already fetched
            console.log("User details already fetched");
            if (req.user.email) {
                var redirectTo = req.session.redirect;
                if (redirectTo) {
                    delete req.session.redirect;
                    res.redirect(redirectTo);
                } else {
                    res.redirect("/");
                }
            } else {
                res.render('complete-registration', {
                    title: 'Complete Registration | SciBase OPRS',
                    user: req.user,
                });
            }
        } else {
        // User is probably logging in for the first time. Fetch details from ORCID.
            console.log("Fetching user details");
            orcidUtil.fetchUserDetails(orcid, function() {
                if (req.user.email) {
                    var redirectTo = req.session.redirect;
                    if (redirectTo) {
                        delete req.session.redirect;
                        res.redirect(redirectTo);
                    } else {
                        res.redirect("/");
                    }
                } else {
                    res.render('complete-registration', {
                        title: 'Complete Registration | SciBase OPRS',
                        user: req.user,
                    });
                }
            });
        }
    });
});

router.post('/complete-registration', function(req, res) {
    var email_id = req.body.email_id;

    User.findOneAndUpdate({ orcid: req.user.orcid }, { email: email_id }, (err, user) => {
        if (err) next(err);
        console.log("Email updated");

        var redirectTo = req.session.redirect;
        if (redirectTo) {
            delete req.session.redirect;
            res.redirect(redirectTo);
        } else {
            res.redirect("/");
        }
    });
});

router.get('/login', function(req, res) {
    req.session.redirect = req.headers.referer;
    res.render('login', {
        title: "Login - SciBase | OPRS",
        user: req.user,
        message: req.flash('error'),
    });
});

router.get('/logout', function(req, res, next) {
    req.logout();
    req.session.save(function(err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

router.get('/getSubCategories', function(req, res, next) {
    var cat = req.query.category_id;

    res.send(arxiv.category_subcategory_mapping[cat]);
});

router.get('/ping', function(req, res) {
    res.status(200).send("pong!");
});

router.get('/public_articles/view/:article_id', function(req, res) {
    var context = {};
    var article_id = req.params.article_id;
    console.log("Article id", article_id);

    ArxivArticle.findOneAndUpdate({
        arxiv_id: article_id
    }, {
        $inc: {
            views: 1
        }
    }, function(err, article) {
        if (err) next(err);

        if (article) {
            console.log("Number of views:", article.views);

            // console.log("Found article\n", article);
            context.title = article.title;
            context.id = article_id;
            context.author_names = article.authors.map(function(a) {
                return a.name;
            }).join(", ");
            context.publish_date = article.published_at.toDateString();
            context.arxiv_url = article.arxiv_url;
            context.pdf_url = article.pdf_url;
            context.arxiv_comments = article.arxiv_comments;
            context.category_name = article.arxiv_category;
            context.summary = article.summary;
            context.comments = article.comments.map(function(c) {
                c.created_at = c.created_at.toDateString();
                return c;
            });
            context.user = req.user;
            context.isAuthenticated = req.isAuthenticated();
            res.render('arxiv_article', context);
        } else {
            arxiv.fetchArticle(article_id, function() {
                res.redirect("/public_articles/view/" + article_id);
            });
        }
    }); // findOne ends
});

router.post('/public_articles/view/:article_id', function(req, res) {
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
        }, function(err, article) {
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
                context.author_names = article.authors.map(function(a) {
                    return a.name;
                }).join(", ");
                context.publish_date = article.published_at.toDateString();
                context.arxiv_url = article.arxiv_url;
                context.pdf_url = article.pdf_url;
                context.arxiv_comments = article.arxiv_comments;
                context.category_name = article.arxiv_category;
                context.summary = article.summary;
                context.comments = article.comments.map(function(c) {
                    c.created_at = c.created_at.toDateString();
                    return c;
                });
                context.user = req.user;
                context.isAuthenticated = req.isAuthenticated();
                res.render('arxiv_article', context);
            } else {
                res.status(404).send("Article not found");
            }
        });
    } else {
        // User is not logged in
        res.redirect("/login");
    }
});

router.get("/public_articles", function(req, res) {
    var context = {};
    var popular_articles = [],
        recently_reviewed_articles = [];

    // List of categories for dropdown
    context['categories'] = arxiv.categories;

    context.user = req.user;
    context.isAuthenticated = req.isAuthenticated();

    ArxivArticle.find({}).sort('-views').limit(10).exec(function(err, results) {
        if (!err) {
            console.log("Popular articles:", results);
            ArxivArticle.find({}).sort('-last_commented_at').limit(10).exec(function(err1, results1) {
                if (!err1) {
                    console.log("Recently reviewed articles:", results1);
                    for (var i = 0; i < results.length; i++) {
                        var temp = {};
                        temp.id = results[i].arxiv_id;
                        temp.title = results[i].title;
                        temp.author_names = results[i].authors.map(function(a) {
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

router.post("/public_articles", function(req, res) {
    var context = {};
    var search_term = req.body.search_term;

    // List of categories for dropdown
    context['categories'] = arxiv.categories;
    context.user = req.user;
    context.isAuthenticated = req.isAuthenticated();

    res.redirect('/public_articles/search?q=' + search_term.replace(/ /g, '+') + '&p=1')
});

router.get("/public_articles/search", function(req, res) {
    var context = {};
    var search_term, base_url, page = 1,
        cat = null,
        subCat = null,
        author = null;
    var sortBy = null,
        sortOrder = null;

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

    arxiv.searchArticles(arxiv_query, (page - 1) * 10, function(result) {
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
        } else {
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
