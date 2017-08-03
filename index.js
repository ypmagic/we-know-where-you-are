var express = require("express"),
    app = express(),
    request = require("request");
    
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));

// var weirdCities = ["refer", "alternative", "refers"];
// function containsWeird(extract) {
//     weirdCities.forEach(function(weird) {
//         return extract.includes(weird);
//     })
// }


var regionName = "";
var geoRequest = request("http://freegeoip.net/json/", function(error, response, body) {
    if (!error && response.statusCode == 200) {
        var parsed = JSON.parse(body);
        geoRequest = parsed["city"]; 
        regionName = parsed["region_name"];
    } 
});

app.get("/", function(req, res) {
    var extract = "";
    var wikiText = request("https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&indexpageids&exintro=&explaintext=&titles=" + geoRequest, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var parsed = JSON.parse(body);
            var pageId = parsed["query"]["pageids"][0];
            extract = parsed["query"]["pages"][pageId]["extract"];
            if (extract.includes("refer") || extract.includes("alternative") || extract.includes("refers")) {
                geoRequest += ", " + regionName;
                var secondReq = request("https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&indexpageids&exintro=&explaintext=&titles=" + geoRequest, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var parsed = JSON.parse(body);
                        var pageId = parsed["query"]["pageids"][0];
                        extract = parsed["query"]["pages"][pageId]["extract"];
                        res.render("index", {
                            city: geoRequest,
                            text: extract
                        });
                    }
                }); 
            } else {
                res.render("index", {
                    city: geoRequest,
                    text: extract
                });
            }
        }
    });
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});