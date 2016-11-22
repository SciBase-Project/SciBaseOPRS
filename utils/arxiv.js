var request = require("request");
var xml2js = require("xml2js");
var ArxivArticle = require("../models/arxiv_article");
var dotenv = require("dotenv");

dotenv.config();

module.exports = {
    checkIfAuthor: function(author, callback) {

        var NEO4J_API_URL = "http://"+process.env.NEO4J_HOST_NAME+"/db/data/transaction/commit";
        var NEO4J_USER = process.env.NEO4J_USER;
        var NEO4J_PASS = process.env.NEO4J_PASSWORD;
        var Authors = [];
        //console.log(NEO4J_API_URL, NEO4J_USER, NEO4J_PASS);
        var query;

        if (author.length <= 2){
            query = "MATCH (a:Author) where a.Name =~ '(?i).*"+author+".*' return distinct a.Name LIMIT 10";
        }else{
            query ="MATCH (a:Author) where a.Name =~ '(?i).*"+author+".*' return distinct a.Name";
        }
        var request_json = {
            "statements": [{
                "statement": query
            }]
        };

        
        
        var auth_payload = new Buffer(NEO4J_USER + ":" + NEO4J_PASS).toString('base64');
        var res = request({
            url: NEO4J_API_URL,
            method: "POST",
            json: request_json,
            headers: {
                "Authorization": "Basic " + auth_payload,
                "Accept": "application/json; charset=UTF-8",
            }
        }, function(err, response, body) {
            if (!err && response.statusCode === 200) {
                for(var i = 0;i<body.results[0].data.length; i++)
                    Authors.push(body.results[0].data[i].row[0]);
            }
            else {
                console.log(err);
            }
            callback(Authors);
        }); // request ends
    },
    searchNeo4j: function(author, page, callback) {

        var NEO4J_API_URL = "http://"+process.env.NEO4J_HOST_NAME+"/db/data/transaction/commit";
        var NEO4J_USER = process.env.NEO4J_USER;
        var NEO4J_PASS = process.env.NEO4J_PASSWORD;
        var results_object = {};
        var results = [];
        var matching_param = "";
        var query = "match (a:Article)-[:authored_by]->(b:Author) where ";

       for(var i = 0; i< author.length; i++){
            matching_param += (i==0)?("b.Name =~ '"+author[i]+"' "): ("or b.Name =~ '"+author[i]+"' ");
       }
       query +=matching_param;
       var count_query = query;
       count_query+="return count(a)";
       query+="return a.Title, a.DOI, a.Year, a.Month, b.Name order by b.Name desc skip "+((page-1)*10)+" limit 10";

       console.log("neo4j query ",query);
        var request_json = {
            "statements": [{
                "statement": query
            },{
                "statement":count_query
            }]
        };

        var auth_payload = new Buffer(NEO4J_USER + ":" + NEO4J_PASS).toString('base64');
        var res = request({
            url: NEO4J_API_URL,
            method: "POST",
            json: request_json,
            headers: {
                "Authorization": "Basic " + auth_payload,
                "Accept": "application/json; charset=UTF-8",
            }
        }, function(err, response, body) {
            
            if (!err && response.statusCode === 200) {
                results_object.count = body.results[1].data[0].row[0];
                for(var i = 0;i<body.results[0].data.length; i++){
                    var temp = {}, temp_id;
                    temp.id = body.results[0].data[i].row[1];       //DOI
                    temp.title = body.results[0].data[i].row[0];    //Title
                    temp.published_at = body.results[0].data[i].row[3] +" "+ body.results[0].data[i].row[2]; // YEAR + MONTH
                    temp.authors = body.results[0].data[i].row[4];  //AUTHORS
                    results.push(temp);

                    results_object.results = results;
                }
                
            }
            else {
                console.log(err);
            }
            callback(results_object);
        }); // request ends
    },
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

    }, // searchArticles

    categories: [
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
    ],

    category_subcategory_mapping: {
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
    }
};
