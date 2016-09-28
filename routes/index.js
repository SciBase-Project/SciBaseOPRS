var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var ArxivArticle = require('../models/arxiv_article');
var arxiv = require("../utils/arxiv");
var router = express.Router();

//--------------------

var categories = [
    {title: 'Astrophysics', value: 'astro-ph'},
    {title: 'Condensed Matter', value: 'cond-mat'},
    {title: 'Computer Science', value: 'cs'},
    {title: 'General Relativity and Quantum Cosmology', value: 'gr-qc'},
    {title: 'High Energy Physics - Experiment ', value: 'hep-ex'},
    {title: 'High Energy Physics - Lattice ', value: 'hep-lat'},
    {title: 'High Energy Physics - Phenomenology ', value: 'hep-ph'},
    {title: 'High Energy Physics - Theory ', value: 'hep-th'},
    {title: 'Mathematical Physics', value: 'math-ph'},
    {title: 'Mathematics', value: 'math'},
    {title: 'Nonlinear Sciences', value: 'nlin'},
    {title: 'Nuclear Experiment ', value: 'nucl-ex'},
    {title: 'Nuclear Theory ', value: 'nucl-th'},
    {title: 'Physics', value: 'physics'},
    {title: 'Quantitative Biology', value: 'q-bio'},
    {title: 'Quantum Physics', value: 'quant-ph'},
    {title: 'Statistics', value: 'stat'},
];

var category_subcategory_mapping = {
    'astro-ph': [],
    'cond-mat': [
        {title: 'Disordered Systems and Neural Networks', value: 'dis-nn'},
        {title: 'Mesoscopic Systems and Quantum Hall Effect', value: 'mes-hall'},
        {title: 'Materials Science', value: 'mtrl-sci'},
        {title: 'Other', value: 'other'},
        {title: 'Soft Condensed Matter', value: 'soft'},
        {title: 'Statistical Mechanics', value: 'stat-mech'},
        {title: 'Strongly Correlated Electrons', value: 'str-el'},
        {title: 'Superconductivity', value: 'supr-con'}
    ],
    'cs': [
        {title: 'Artificial Intelligence', value: 'AI'},
        {title: 'Architecture', value: 'AR'},
        {title: 'Computational Complexity', value: 'CC'},
        {title: 'Computational Engineering; Finance; and Science', value: 'CE'},
        {title: 'Computational Geometry', value: 'CG'},
        {title: 'Computation and Language', value: 'CL'},
        {title: 'Cryptography and Security', value: 'CR'},
        {title: 'Computer Vision and Pattern Recognition', value: 'CV'},
        {title: 'Computers and Society', value: 'CY'},
        {title: 'Databases', value: 'DB'},
        {title: 'Distributed; Parallel; and Cluster Computing', value: 'DC'},
        {title: 'Digital Libraries', value: 'DL'},
        {title: 'Discrete Mathematics', value: 'DM'},
        {title: 'Data Structures and Algorithms', value: 'DS'},
        {title: 'General Literature', value: 'GL'},
        {title: 'Graphics', value: 'GR'},
        {title: 'Computer Science and Game Theory', value: 'GT'},
        {title: 'Human-Computer Interaction', value: 'HC'},
        {title: 'Information Retrieval', value: 'IR'},
        {title: 'Information Theory', value: 'IT'},
        {title: 'Learning', value: 'LG'},
        {title: 'Logic in Computer Science', value: 'LO'},
        {title: 'Multiagent Systems', value: 'MA'},
        {title: 'Multimedia', value: 'MM'},
        {title: 'Mathematical Software', value: 'MS'},
        {title: 'Numerical Analysis', value: 'NA'},
        {title: 'Neural and Evolutionary Computing', value: 'NE'},
        {title: 'Networking and Internet Architecture', value: 'NI'},
        {title: 'Other', value: 'OH'},
        {title: 'Operating Systems', value: 'OS'},
        {title: 'Performance', value: 'PF'},
        {title: 'Programming Languages', value: 'PL'},
        {title: 'Robotics', value: 'RO'},
        {title: 'Symbolic Computation', value: 'SC'},
        {title: 'Sound', value: 'SD'},
        {title: 'Software Engineering', value: 'SE'}
    ],
    'gr-qc': [],
    'hep-ex': [],
    'hep-lat': [],
    'hep-ph': [],
    'hep-th': [],
    'math-ph': [],
    'math': [
        {title: 'Commutative Algebra', value: 'AC'},
        {title: 'Algebraic Geometry', value: 'AG'},
        {title: 'Analysis of PDEs', value: 'AP'},
        {title: 'Algebraic Topology', value: 'AT'},
        {title: 'Classical Analysis and ODEs', value: 'CA'},
        {title: 'Combinatorics', value: 'CO'},
        {title: 'Category Theory', value: 'CT'},
        {title: 'Complex Variables', value: 'CV'},
        {title: 'Differential Geometry', value: 'DG'},
        {title: 'Dynamical Systems', value: 'DS'},
        {title: 'Functional Analysis', value: 'FA'},
        {title: 'General Mathematics', value: 'GM'},
        {title: 'General Topology', value: 'GN'},
        {title: 'Group Theory', value: 'GR'},
        {title: 'Geometric Topology', value: 'GT'},
        {title: 'History and Overview', value: 'HO'},
        {title: 'Information Theory', value: 'IT'},
        {title: 'K-Theory and Homology', value: 'KT'},
        {title: 'Logic', value: 'LO'},
        {title: 'Metric Geometry', value: 'MG'},
        {title: 'Mathematical Physics', value: 'MP'},
        {title: 'Numerical Analysis', value: 'NA'},
        {title: 'Number Theory', value: 'NT'},
        {title: 'Operator Algebras', value: 'OA'},
        {title: 'Optimization and Control', value: 'OC'},
        {title: 'Probability', value: 'PR'},
        {title: 'Quantum Algebra', value: 'QA'},
        {title: 'Rings and Algebras', value: 'RA'},
        {title: 'Representation Theory', value: 'RT'},
        {title: 'Symplectic Geometry', value: 'SG'},
        {title: 'Spectral Theory', value: 'SP'},
        {title: 'Statistics', value: 'ST'}
    ],
    'nlin': [
        {title: 'Adaptation and Self-Organizing Systems', value: 'AO'},
        {title: 'Chaotic Dynamics', value: 'CD'},
        {title: 'Cellular Automata and Lattice Gases', value: 'CG'},
        {title: 'Pattern Formation and Solitons', value: 'PS'},
        {title: 'Exactly Solvable and Integrable Systems', value: 'SI'}
    ],
    'nucl-ex': [],
    'nucl-th': [],
    'physics': [
        {title: 'Accelerator Physics', value: 'acc-ph'},
        {title: 'Atmospheric and Oceanic Physics', value: 'ao-ph'},
        {title: 'Atomic and Molecular Clusters', value: 'atm-clus'},
        {title: 'Atomic Physics', value: 'atom-ph'},
        {title: 'Biological Physics', value: 'bio-ph'},
        {title: 'Chemical Physics', value: 'chem-ph'},
        {title: 'Classical Physics', value: 'class-ph'},
        {title: 'Computational Physics', value: 'comp-ph'},
        {title: 'Data Analysis; Statistics and Probability', value: 'data-an'},
        {title: 'Physics Education', value: 'ed-ph'},
        {title: 'Fluid Dynamics', value: 'flu-dyn'},
        {title: 'General Physics', value: 'gen-ph'},
        {title: 'Geophysics', value: 'geo-ph'},
        {title: 'History of Physics', value: 'hist-ph'},
        {title: 'Instrumentation and Detectors', value: 'ins-det'},
        {title: 'Medical Physics', value: 'med-ph'},
        {title: 'Optics', value: 'optics'},
        {title: 'Plasma Physics', value: 'plasm-ph'},
        {title: 'Popular Physics', value: 'pop-ph'},
        {title: 'Physics and Society', value: 'soc-ph'},
        {title: 'Space Physics', value: 'space-ph'}
    ],
    'q-bio': [
        {title: 'Biomolecules', value: 'BM'},
        {title: 'Cell Behavior', value: 'CB'},
        {title: 'Genomics', value: 'GN'},
        {title: 'Molecular Networks', value: 'MN'},
        {title: 'Neurons and Cognition', value: 'NC'},
        {title: 'Other', value: 'OT'},
        {title: 'Populations and Evolution', value: 'PE'},
        {title: 'Quantitative Methods', value: 'QM'},
        {title: 'Subcellular Processes', value: 'SC'},
        {title: 'Tissues and Organs', value: 'TO'}
    ],
    'quant-ph': [],
    'stat': [
        {title: 'Applications', value: 'AP'},
        {title: 'Computation', value: 'CO'},
        {title: 'Methodology', value: 'ME'},
        {title: 'Machine Learning', value: 'ML'},
        {title: 'Theory', value: 'TH'}
    ],
};

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
        if (err) throw err;

        if (article) {
            console.log("Number of views:", article.views);

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

router.post('/public_articles/view/:article_id', function(req, res) {
    // TODO: This needs to handle adding of comments via POST request
    var context = {};
    var article_id = req.params.article_id;
    console.log("Article id:", article_id);

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
            res.render('arxiv_article', context);
        }
        else {
            res.status(404).send("Article not found");
        }

    });

});

router.get("/public_articles", function(req, res) {
    var context = {};
    var popular_articles = [], recently_reviewed_articles = [];
    
    // List of categories for dropdown
    context['categories'] = categories;

    ArxivArticle.find({}).sort('-views').limit(10).exec(function(err, results) {
        if (!err) {
            console.log("Popular articles:",results);
            ArxivArticle.find({}).sort('-last_commented_at').limit(10).exec(function(err1, results1) {
                if (!err1) {
                    console.log("Recently reviewed articles:",results1);
                    for (var i=0; i<results.length; i++) {
                        var temp = {};
                        temp.id = results[i].arxiv_id;
                        temp.title = results[i].title;
                        temp.author_names = results[i].authors.map(function(a) {
                            return a.name;
                        }).join(", ");
                        temp.publish_date = results[i].published_at.toDateString();
                        popular_articles.push(temp);
                    }

                    for (i=0; i<results1.length; i++) {
                        var temp = {};
                        temp.id = results1[i].arxiv_id;
                        temp.title = results1[i].title;
                        recently_reviewed_articles.push(temp);
                    }

                    console.log("\n\nPop Art:",popular_articles);
                    console.log("\n\nRec Art:",recently_reviewed_articles);
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
    context['categories'] = categories;

    res.redirect('/public_articles/search?q='+ search_term.replace(/ /g,'+') +'&p=1')
});

router.get("/public_articles/search", function(req, res) {
    var context = {};
    var search_term, base_url, page = 1, cat = null, subCat = null;
    
    // List of categories for dropdown
    context['categories'] = categories;

    // Base URL for constructing URL of the different pages of search results
    base_url = "/public_articles/search?";

    if(req.query.q) {
       base_url += "q=" + req.query.q;
       search_term = req.query.q.replace(/\+/g,' ');
       // search_term = decodeURIComponent(search_term);
    }

    if(req.query.cat) {
        base_url += "&cat=" + req.query.cat;
        cat = decodeURIComponent(req.query.cat);
    }
    
    if(req.query.subcat) {
        base_url += "&subcat=" + req.query.subcat;
        subCat = decodeURIComponent(req.query.subcat);
    }
    
    if(req.query.p)
       page = parseInt(req.query.p);

    var arxiv_query = search_term;

    if (cat && subCat)
        arxiv_query += " cat:" + cat + "." + subCat;
    else if (cat)
        arxiv_query += " cat:" + cat;

    console.log("Search term:",search_term,"Page:",page);

    arxiv.searchArticles(arxiv_query, (page-1)*10, function(result) {
        console.log("Search result",result);
        context.count = result.count;
        context.search_results = result.results;
        if(search_term) {
            context.search_term = search_term;
            context.search_term_safe = search_term.replace(' ','+');
        }
        context.page_number = page;
        context.pages = [];
        context.previous = context.page_number === 1? false:true;
        context.next = total_pages - context.page_number >= 10? false:true;
        context.previous_page = context.page_number - 1;
        context.previous_page_url = base_url + "&p=" + context.previous_page;
        context.next_page = context.page_number + 1;
        context.next_page_url = base_url + "&p=" + context.next_page;
        var total_pages = context.count/10;
        if(total_pages-context.page_number+1 >= 10)
        {
            for(i=context.page_number; i<context.page_number+10; i++)
            {
                context.pages.push({
                    number: i,
                    link: base_url + "&p=" + i
                });
            }
        }
        else {
            for(i=context.page_number; i<total_pages-context.page_number+1; i++)
            {
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
