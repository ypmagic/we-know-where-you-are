var express = require("express"),
    app = express(),
    request = require("request"),
    server = require('http').Server(app),
    io = require('socket.io').listen(server);
    
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));

var weirdCities = ["refer", "alternative", "refers", "several"];

function getCity(ip, callback) {
    var city = "";
    var regionName = "";
    var countryCode = "";
    var countryName = "";
    request("https://freegeoip.net/json/" + ip, function(error, response, body) {
        var parsed = JSON.parse(body);
        city += parsed["city"];
        regionName += parsed["region_name"];
        countryCode += parsed["country_code"];
        countryName += parsed["country_name"];
        callback({
            city: city,
            regionName: regionName,
            countryCode: countryCode,
            countryName: countryName
        })
        return;
    });
}

function getWikiQuery(body, extract, geoRequest, callback) {
    if (body["query"].hasOwnProperty(["redirects"])) {
        callback("https://en.wikipedia.org/w/api.php?format=json&action=query&redirects&prop=extracts&indexpageids&exintro=&explaintext=&titles=" + body["query"]["redirects"][0]["to"])
    } else {
        if (geoRequest["countryCode"] === "US") {
            callback("https://en.wikipedia.org/w/api.php?format=json&action=query&redirects&prop=extracts&indexpageids&exintro=&explaintext=&titles=" + geoRequest["city"] + ", " + geoRequest["regionName"]);
        } else {
            callback("https://en.wikipedia.org/w/api.php?format=json&action=query&redirects&prop=extracts&indexpageids&exintro=&explaintext=&titles=" + geoRequest["city"] + ", " + geoRequest["countryName"]);  
        }
    }
    return;
}

function containsWeird(extract, callback) {
    var containsOne = false;
    if (extract === "") {
        containsOne = true;
    }
    weirdCities.forEach(function(weird) {
        if (extract.includes(weird)) {
            containsOne = true;
        }
    })
    callback(containsOne);
    return;
}

app.get("/", function(req, res) {
    var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
    getCity(ip, function(response) {
        var geoRequest = response;
        var extract = "";
        var wikiText = request("https://en.wikipedia.org/w/api.php?format=json&action=query&redirects&prop=extracts&indexpageids&exintro=&explaintext=&titles=" + geoRequest["city"], function(error, response, body) {
            if (!error && response.statusCode == 200) {
                var parsed = JSON.parse(body);
                var pageId = parsed["query"]["pageids"][0];
                extract = parsed["query"]["pages"][pageId]["extract"];
                containsWeird(extract, function(response) {
                   if (response) {
                       getWikiQuery(parsed, extract, geoRequest, function(response) {
                          var secondRequestUrl = response;
                          var secondRequest = request(secondRequestUrl, function(error, response, body) {
                             if (!error && response.statusCode == 200) {
                                 parsed = JSON.parse(body);
                                 pageId = parsed["query"]["pageids"][0];
                                 extract = parsed["query"]["pages"][pageId]["extract"];
                                 if (geoRequest["countryCode"] == "US") {
                                     res.render("index", {
                                        city: geoRequest["city"] + ", " + geoRequest["regionName"],
                                        text: extract
                                     });
                                 } else {
                                     res.render("index", {
                                        city: geoRequest["city"] + ", " + geoRequest["countryName"],
                                        text: extract
                                     });
                                 }
                             } 
                          });
                       });
                   } else {
                       res.render("index", {
                           city: geoRequest["city"],
                           text: extract
                       })
                   }
                });
            }
        });
    })
});

app.get("/", function(req, res) {
    var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;

});

// var port = process.env.PORT || 8000;
// server.listen(port, function() {
//     console.log("App is running on port " + port);
// });

app.listen(process.env.PORT, process.env.IP, function() {
    console.log("The server has started.");
});