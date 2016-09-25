var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var ArxivArticle = require('../models/arxiv_article');
var arxiv = require("../utils/arxiv");
var router = express.Router();

//--------------------

var categories = [
    {'astro-ph': 'Astrophysics'},
    {'cond-mat': 'Condensed Matter'},
    {'cs': 'Computer Science'},
    {'gr-qc': 'General Relativity and Quantum Cosmology'},
    {'hep-ex': 'High Energy Physics - Experiment '},
    {'hep-lat': 'High Energy Physics - Lattice '},
    {'hep-ph': 'High Energy Physics - Phenomenology '},
    {'hep-th': 'High Energy Physics - Theory '},
    {'math-ph': 'Mathematical Physics'},
    {'math': 'Mathematics'},
    {'nlin': 'Nonlinear Sciences'},
    {'nucl-ex': 'Nuclear Experiment '},
    {'nucl-th': 'Nuclear Theory '},
    {'physics': 'Physics'},
    {'q-bio': 'Quantitative Biology'},
    {'quant-ph': 'Quantum Physics'},
    {'stat': 'Statistics'},
];

var category_subcategory_mapping = [
    {'astro-ph': []},
    {'cond-mat': [
        {'dis-nn': 'Disordered Systems and Neural Networks'},
        {'mes-hall': 'Mesoscopic Systems and Quantum Hall Effect'},
        {'mtrl-sci': 'Materials Science'},
        {'other': 'Other'},
        {'soft': 'Soft Condensed Matter'},
        {'stat-mech': 'Statistical Mechanics'},
        {'str-el': 'Strongly Correlated Electrons'},
        {'supr-con': 'Superconductivity'}
    ]},
    {'cs': [
        {'AI': 'Artificial Intelligence'},
        {'AR': 'Architecture'},
        {'CC': 'Computational Complexity'},
        {'CE': 'Computational Engineering; Finance; and Science'},
        {'CG': 'Computational Geometry'},
        {'CL': 'Computation and Language'},
        {'CR': 'Cryptography and Security'},
        {'CV': 'Computer Vision and Pattern Recognition'},
        {'CY': 'Computers and Society'},
        {'DB': 'Databases'},
        {'DC': 'Distributed; Parallel; and Cluster Computing'},
        {'DL': 'Digital Libraries'},
        {'DM': 'Discrete Mathematics'},
        {'DS': 'Data Structures and Algorithms'},
        {'GL': 'General Literature'},
        {'GR': 'Graphics'},
        {'GT': 'Computer Science and Game Theory'},
        {'HC': 'Human-Computer Interaction'},
        {'IR': 'Information Retrieval'},
        {'IT': 'Information Theory'},
        {'LG': 'Learning'},
        {'LO': 'Logic in Computer Science'},
        {'MA': 'Multiagent Systems'},
        {'MM': 'Multimedia'},
        {'MS': 'Mathematical Software'},
        {'NA': 'Numerical Analysis'},
        {'NE': 'Neural and Evolutionary Computing'},
        {'NI': 'Networking and Internet Architecture'},
        {'OH': 'Other'},
        {'OS': 'Operating Systems'},
        {'PF': 'Performance'},
        {'PL': 'Programming Languages'},
        {'RO': 'Robotics'},
        {'SC': 'Symbolic Computation'},
        {'SD': 'Sound'},
        {'SE': 'Software Engineering'}
    ]},
    {'gr-qc': []},
    {'hep-ex': []},
    {'hep-lat': []},
    {'hep-ph': []},
    {'hep-th': []},
    {'math-ph': []},
    {'math': [
        {'AC': 'Commutative Algebra'},
        {'AG': 'Algebraic Geometry'},
        {'AP': 'Analysis of PDEs'},
        {'AT': 'Algebraic Topology'},
        {'CA': 'Classical Analysis and ODEs'},
        {'CO': 'Combinatorics'},
        {'CT': 'Category Theory'},
        {'CV': 'Complex Variables'},
        {'DG': 'Differential Geometry'},
        {'DS': 'Dynamical Systems'},
        {'FA': 'Functional Analysis'},
        {'GM': 'General Mathematics'},
        {'GN': 'General Topology'},
        {'GR': 'Group Theory'},
        {'GT': 'Geometric Topology'},
        {'HO': 'History and Overview'},
        {'IT': 'Information Theory'},
        {'KT': 'K-Theory and Homology'},
        {'LO': 'Logic'},
        {'MG': 'Metric Geometry'},
        {'MP': 'Mathematical Physics'},
        {'NA': 'Numerical Analysis'},
        {'NT': 'Number Theory'},
        {'OA': 'Operator Algebras'},
        {'OC': 'Optimization and Control'},
        {'PR': 'Probability'},
        {'QA': 'Quantum Algebra'},
        {'RA': 'Rings and Algebras'},
        {'RT': 'Representation Theory'},
        {'SG': 'Symplectic Geometry'},
        {'SP': 'Spectral Theory'},
        {'ST': 'Statistics'}
    ]},
    {'nlin': [
        {'AO': 'Adaptation and Self-Organizing Systems'},
        {'CD': 'Chaotic Dynamics'},
        {'CG': 'Cellular Automata and Lattice Gases'},
        {'PS': 'Pattern Formation and Solitons'},
        {'SI': 'Exactly Solvable and Integrable Systems'}
    ]},
    {'nucl-ex': []},
    {'nucl-th': []},
    {'physics': [
        {'acc-ph' : 'Accelerator Physics'},
        {'ao-ph' : 'Atmospheric and Oceanic Physics'},
        {'atm-clus' : 'Atomic and Molecular Clusters'},
        {'atom-ph' : 'Atomic Physics'},
        {'bio-ph' : 'Biological Physics'},
        {'chem-ph' : 'Chemical Physics'},
        {'class-ph' : 'Classical Physics'},
        {'comp-ph' : 'Computational Physics'},
        {'data-an' : 'Data Analysis; Statistics and Probability'},
        {'ed-ph' : 'Physics Education'},
        {'flu-dyn' : 'Fluid Dynamics'},
        {'gen-ph' : 'General Physics'},
        {'geo-ph' : 'Geophysics'},
        {'hist-ph' : 'History of Physics'},
        {'ins-det' : 'Instrumentation and Detectors'},
        {'med-ph' : 'Medical Physics'},
        {'optics' : 'Optics'},
        {'plasm-ph' : 'Plasma Physics'},
        {'pop-ph' : 'Popular Physics'},
        {'soc-ph' : 'Physics and Society'},
        {'space-ph' : 'Space Physics'}
    ]},
    {'q-bio': [
        {'BM': 'Biomolecules'},
        {'CB': 'Cell Behavior'},
        {'GN': 'Genomics'},
        {'MN': 'Molecular Networks'},
        {'NC': 'Neurons and Cognition'},
        {'OT': 'Other'},
        {'PE': 'Populations and Evolution'},
        {'QM': 'Quantitative Methods'},
        {'SC': 'Subcellular Processes'},
        {'TO': 'Tissues and Organs'}
    ]},
    {'quant-ph': []},
    {'stat': [
        {'AP': 'Applications'},
        {'CO': 'Computation'},
        {'ME': 'Methodology'},
        {'ML': 'Machine Learning'},
        {'TH': 'Theory'}
    ]},
];

//--------------------

router.get('/', function(req, res) {
    res.render('index', {
        title: 'SciBase OPRS',
        user: req.user,
        layout: 'main'
    });
});

router.get('/register', function(req, res) {
    res.render('register', {
    	layout:'alt'
    });
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

router.get('/getSubCategories', function(req, res, next) {
    var cat = req.query.category_id;

    res.send(category_subcategory_mapping[cat]);
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
            // Increment views count
            article.views.$inc();
            article.save();
            console.log("Views:", article.views);

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
    var context = {};
    context['categories'] = categories;


    res.render("public_articles",context);
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
                    link: '/public_articles/search/'+ search_term.replace(/ /g,'+') +'/'+i
                });
            }
        }
        else {
            for(i=context.page_number; i<total_pages-context.page_number+1; i++)
            {
                context.pages.push({
                    number: i,
                    link: '/public_articles/search/'+ search_term.replace(/ /g,'+') +'/'+i
                });
            }
        }
        res.render("public_articles", context);
    });

});

router.get("/public_articles/search/:search_term", function(req, res) {
    var context = {};
    var search_term = req.params.search_term.replace(/\+/g,' ');
    console.log("Search term",search_term);

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
                    link: '/public_articles/search/'+ search_term.replace(/ /g,'+') +'/'+i
                });
            }
        }
        else {
            for(i=context.page_number; i<total_pages-context.page_number+1; i++)
            {
                context.pages.push({
                    number: i,
                    link: '/public_articles/search/'+ search_term.replace(/ /g,'+') +'/'+i
                });
            }
        }
        res.render("public_articles", context);
    });
});

router.get("/public_articles/search/:search_term/:page", function(req, res) {
    var context = {};
    var search_term = req.params.search_term.replace(/\+/g,' ');
    console.log("Search term",search_term);
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
                    link: '/public_articles/search/'+ search_term.replace(/ /g,'+') +'/'+i
                });
            }
        }
        else {
            for(i=context.page_number; i<total_pages-context.page_number+1; i++)
            {
                context.pages.push({
                    number: i,
                    link: '/public_articles/search/'+ search_term.replace(/ /g,'+') +'/'+i
                });
            }
        }
        res.render("public_articles", context);
    });
});

module.exports = router;
