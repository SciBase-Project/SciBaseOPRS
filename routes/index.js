var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var ArxivArticle = require('../models/arxiv_article');
var arxiv = require("../utils/arxiv");
var router = express.Router();

router.get('/', function(req, res) {
    res.render('index', {
        title: 'SciBase OPRS',
        user: req.user,
        layout: 'alt'
    });
});

router.get('/register', function(req, res) {
    res.render('register', {});
});

router.post('/register', function(req, res, next) {
    if (req.body.password !== req.body.confirm_password) {
        return res.render("register", {
            info: "Passwords don't match. Try again.",
            layout: 'alt'
        });
    }
    Account.register(new Account({
        username: req.body.username,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        university: req.body.university,
        department: req.body.department
    }), req.body.password, function(err, account) {
        if (err) {
            return res.render("register", {
                info: "Sorry. That username already exists. Try again.",
                layout: 'alt'
            });
        }

        passport.authenticate('local')(req, res, function() {
            req.session.save(function(err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    });
});


router.get('/login', function(req, res) {
    res.render('login', {
        user: req.user,
        message: req.flash('error'),
        layout: 'alt'
    });
});

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), function(req, res, next) {
    req.session.save(function(err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
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

router.get('/universityList', function(req, res, next) {
    var universityList = [
        "ActionScript",
        "AppleScript",
        "Asp",
        "BASIC",
        "C",
        "C++",
        "Clojure",
        "COBOL",
        "ColdFusion",
        "Erlang",
        "Fortran",
        "Groovy",
        "Haskell",
        "Java",
        "JavaScript",
        "Lisp",
        "Perl",
        "PHP",
        "Python",
        "Ruby",
        "Scala",
        "Scheme"
    ];
    res.send(universityList);
});

router.get('/ping', function(req, res) {
    res.status(200).send("pong!");
});

router.get('/public_articles/:article_id', function(req, res) {
    var context = {};
    var article_id = req.params.article_id;
    console.log("Article id", article_id);

    ArxivArticle.findOne({
        arxiv_id: article_id
    }, function(err, article) {
        if (err) throw err;

        if (article) {
            // console.log("Found article\n", article);
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
            res.render('arxiv_article', context);
        } else {
            arxiv.fetchArticle(article_id, function() {
                res.redirect("/public_articles/" + article_id);
            });
        }
    }); // findOne ends
});

router.post('/public_articles/:article_id', function(req, res) {
    // TODO: This needs to handle adding of comments via POST request
    var context = {};
    var article_id = req.params.article_id;
    console.log("Article id", article_id);

    var newComment = {
        name: req.body.name,
        text: req.body.message,
        email: req.body.email,
        created_at: new Date()
    };
    console.log("New comment:",newComment);

    ArxivArticle.findOne({
        arxiv_id: article_id
    }, function(err, article) {
        if (err) throw err;

        if(article)
        {
            if (typeof article.comments == 'object') {
                article.comments.push(newComment);
            } else {
                article.comments = [newComment];
            }

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
            res.render('arxiv_article', context);
        }
        else {
            res.status(404).send("Article not found");
        }

    });

});

router.get("/public_articles", function(req, res) {
    res.render("public_articles",{});
});

router.post("/public_articles", function(req, res) {
    var context = {};
    var search_term = req.body.search_term;

    arxiv.searchArticles(search_term, 0, function(result) {
        console.log("Search result",result);
        context.count = result.count;
        context.search_results = result.results;
        context.search_term = search_term;
        context.search_term_safe = search_term.replace(' ','+');
        context.page_number = 1;
        context.pages = [];
        context.previous = context.page_number === 1? false:true;
        context.next = total_pages - context.page_number >= 10? false:true;
        context.previous_page = context.page_number - 1;
        context.next_page = context.page_number + 1;
        var total_pages = context.count/10;
        if(total_pages-context.page_number+1 >= 10)
        {
            for(i=context.page_number; i<context.page_number+10; i++)
            {
                context.pages.push({
                    number: i,
                    link: '/public_articles/search'+search_term.replace(' ','+')+'/'+i
                });
            }
        }
        else {
            for(i=context.page_number; i<total_pages-context.page_number+1; i++)
            {
                context.pages.push({
                    number: i,
                    link: '/public_articles/search'+search_term.replace(' ','+')+'/'+i
                });
            }
        }
        res.render("public_articles", context);
    });

});

router.get("/public_articles/search/:search_term", function(req, res) {
    var context = {};
    var search_term = req.params.search_term.replace('+',' ');

    console.log(search_term);

    arxiv.searchArticles(search_term, 0, function(result) {
        console.log("Search result",result);
        context.count = result.count;
        context.search_results = result.results;
        context.search_term = search_term;
        context.search_term_safe = search_term.replace(' ','+');
        context.page_number = 1;
        context.pages = [];
        context.previous = context.page_number === 1? false:true;
        context.next = total_pages - context.page_number >= 10? false:true;
        context.previous_page = context.page_number - 1;
        context.next_page = context.page_number + 1;
        var total_pages = context.count/10;
        if(total_pages-context.page_number+1 >= 10)
        {
            for(i=context.page_number; i<context.page_number+10; i++)
            {
                context.pages.push({
                    number: i,
                    link: '/public_articles/search'+search_term.replace(' ','+')+'/'+i
                });
            }
        }
        else {
            for(i=context.page_number; i<total_pages-context.page_number+1; i++)
            {
                context.pages.push({
                    number: i,
                    link: '/public_articles/search'+search_term.replace(' ','+')+'/'+i
                });
            }
        }
        res.render("public_articles", context);
    });
});

router.get("/public_articles/search/:search_term/:page", function(req, res) {
    var context = {};
    var search_term = req.params.search_term.replace('+',' ');
    var page = parseInt(req.params.page);

    console.log(search_term, page);

    arxiv.searchArticles(search_term, (page-1)*10, function(result) {
        console.log("Search result",result);
        context.count = result.count;
        context.search_results = result.results;
        context.search_term = search_term;
        context.search_term_safe = search_term.replace(' ','+');
        context.page_number = page;
        context.pages = [];
        context.previous = context.page_number === 1? false:true;
        context.next = total_pages - context.page_number >= 10? false:true;
        context.previous_page = context.page_number - 1;
        context.next_page = context.page_number + 1;
        var total_pages = context.count/10;
        if(total_pages-context.page_number+1 >= 10)
        {
            for(i=context.page_number; i<context.page_number+10; i++)
            {
                context.pages.push({
                    number: i,
                    link: '/public_articles/search'+search_term.replace(' ','+')+'/'+i
                });
            }
        }
        else {
            for(i=context.page_number; i<total_pages-context.page_number+1; i++)
            {
                context.pages.push({
                    number: i,
                    link: '/public_articles/search'+search_term.replace(' ','+')+'/'+i
                });
            }
        }
        res.render("public_articles", context);
    });
});

module.exports = router;
