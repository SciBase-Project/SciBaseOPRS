var request = require("request"); 
var User = require("../models/user");

module.exports = {
    fetchUserDetails: function(orcid, callback) {
        var data = {};
        var parsedData = {};
        var bio = '';
        var researcher_urls = [];
        var keywords = [];
        var contact_details = {};
        var affiliations_list = [];
        var works_list = [];
        var orcid_contributors_list = [];
        var funding_list = [];        

        var get_record_msg = {
            url: 'https://pub.orcid.org/v1.2/[orcid]/orcid-profile',
            method: 'GET',
            headers: {
                "Accept": 'application/orcid+json',
            },
        };
        
        get_record_msg.url = get_record_msg.url.replace('[orcid]', orcid);
        request(get_record_msg, function(error, response, body) {
            if (error && response.statusCode != 200) {
                console.log("Error fetching data");
            } else {
                data = body;
                parsedData = JSON.parse(data);
                console.log("Fetched Data");
                var orcid_bio = parsedData["orcid-profile"]["orcid-bio"];
                if (parsedData["orcid-profile"]["orcid-activities"] != null) {
                    var orcid_affiliation = parsedData["orcid-profile"]["orcid-activities"]["affiliations"];
                    if (orcid_affiliation != null) {
                        var affiliations = orcid_affiliation["affiliation"];
                        for (var i = 0; i < affiliations.length; i++) {
                            var orcid_affiliation_obj = {}
                            orcid_affiliation_obj["type"] = affiliations[i]["type"];
                            orcid_affiliation_obj["department"] = affiliations[i]["department-name"];
                            orcid_affiliation_obj["role"] = affiliations[i]["role-title"];
                            orcid_affiliation_obj["organization"] = affiliations[i]["organization"]["name"];
                            affiliations_list.push(orcid_affiliation_obj);
                        }
                    }
                    if (parsedData["orcid-profile"]["orcid-activities"]["orcid-works"] != null) {
                        var orcid_works = parsedData["orcid-profile"]["orcid-activities"]["orcid-works"]["orcid-work"];
                        for (var i = 0; i < orcid_works.length; i++) {
                            var orcid_works_obj = {};
                            orcid_works_obj["title"] = orcid_works[i]["work-title"]["title"]["value"];
                            orcid_works_obj["journal"] = orcid_works[i]["journal-title"]["value"];
                            orcid_works_obj["citation_type"] = orcid_works[i]["work-citation"]["work-citation-type"];
                            orcid_works_obj["citation"] = orcid_works[i]["work-citation"]["citation"];
                            orcid_works_obj["work_type"] = orcid_works[i]["work-type"];
                            var pubdate = orcid_works[i]["publication-date"];
                            var year = pubdate["year"]["value"];
                            var month = pubdate["month"]["value"];
                            var day = pubdate["day"];
                            if (pubdate != null) {
                                if (day == null) {
                                    var date = 'dd' + '-' + month + '-' + year;
                                } else if (month == null) {
                                    var date = 'dd' + '-' + 'mm' + '-' + year;
                                } else {
                                    var date = day + '-' + month + '-' + year;
                                }
                            }
                            orcid_works_obj["pub_date"] = date;
                            if (orcid_works[i]["work-contributors"] != null) {
                                var orcid_contributors = orcid_works[i]["work-contributors"]["contributor"];
                                for (var j = 0; j < orcid_contributors.length; j++) {
                                    var orcid_contributors_obj = {};
                                    orcid_contributors_obj["contributor_name"] = orcid_contributors[j]["credit-name"]["value"];
                                    orcid_contributors_obj["contributor_role"] = orcid_contributors[j]["contributor-attributes"]["contributor-role"];
                                    orcid_contributors_list.push(orcid_contributors_obj);
                                }
                            }
                            orcid_works_obj["contributors"] = orcid_contributors_list;
                            works_list.push(orcid_works_obj);
                        }
                    }
                }
                if(orcid_bio["biography"] != null){
                    bio = orcid_bio["biography"]["value"];
                }
                var orcid_researcher_urls = orcid_bio["researcher-urls"];
                if (orcid_researcher_urls != null) {
                    var researcher_urls_orcid_list = orcid_researcher_urls["researcher-url"];
                    for (var i = 0; i < researcher_urls_orcid_list.length; i++) {
                        var orcid_research_urls_object = {}
                        orcid_research_urls_object["url_name"] = researcher_urls_orcid_list[i]["url-name"]["value"];
                        orcid_research_urls_object["url"] = researcher_urls_orcid_list[i]["url"]["value"]
                        researcher_urls.push(orcid_research_urls_object);
                    }
                }
                var keywords_list = orcid_bio["keywords"];
                if (keywords_list != null) {
                    keywords_csv = keywords_list["keyword"][0]["value"];
                    keywords = keywords_csv.split(',');
                }
                var orcid_contact_details = orcid_bio["contact-details"];
                if (orcid_contact_details != null) {
                    contact_details["country"] = orcid_contact_details["address"]["country"]["value"];
                    contact_details["email"] = orcid_contact_details["email"];
                }
                var orcid_funding = parsedData["orcid-profile"]["orcid-activities"]["funding-list"];
                if (orcid_funding != null) {
                    var orcid_funding_list = orcid_funding["funding"];
                    for (var i = 0; i < orcid_funding_list.length; i++) {
                        var orcid_funding_obj = {};
                        orcid_funding_obj["funding_type"] = orcid_funding_list[i]["funding-type"];
                        orcid_funding_obj["funding_title"] = orcid_funding_list[i]["funding-title"]["title"]["value"];
                        orcid_funding_obj["description"] = orcid_funding_list[i]["short-description"];
                        orcid_funding_obj["amount"] = {};
                        if (orcid_funding_list[i]["amount"] != null) {
                            orcid_funding_obj["amount"]["currency_code"] = orcid_funding_list[i]["amount"]["currency-code"];
                            orcid_funding_obj["amount"]["amount"] = orcid_funding_list[i]["amount"]["value"];
                        }
                        orcid_funding_obj["url"] = orcid_funding_list[i]["url"]["value"];
                        orcid_funding_obj["agency"] = {};
                        orcid_funding_obj["agency"]["country"] = orcid_funding_list[i]["organization"]["address"]["country"];
                        orcid_funding_obj["agency"]["city"] = orcid_funding_list[i]["organization"]["address"]["city"];
                        orcid_funding_obj["agency"]["name"] = orcid_funding_list[i]["organization"]["name"];
                        funding_list.push(orcid_funding_obj);
                    }
                }

                console.log("Orcid bio : ", bio);
                console.log("Orcid urls : ", researcher_urls);
                console.log("Orcid keywords : ", keywords);
                console.log("Orcid contact details : ", contact_details);
                console.log("Orcid affiliations : ", affiliations_list);
                console.log("Orcid works : ", works_list);
                console.log("Orcid funding : ", funding_list);

                User.findOneAndUpdate({ orcid: orcid }, { bio: bio, researcher_urls: researcher_urls, keywords: keywords, contact_details: contact_details, affiliations: affiliations_list, works: works_list, funding: funding_list, fetched_orcid_data: true }, (err, user) => {
                    if (err) console.log(err);
                    console.log("Data added");
                    callback();
                });
            }
        });
    } // fetchUserDetails ends
}