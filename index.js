var express = require("express"),
    app = express(),
    request = require("request"),
    server = require('http').Server(app),
    io = require('socket.io').listen(server);
    
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));

// var weirdCities = ["refer", "alternative", "refers"];
// function containsWeird(extract) {
//     weirdCities.forEach(function(weird) {
//         return extract.includes(weird);
//     })
// }

function getCity(ip, callback) {
    var city = "";
    var regionName = "";
    request("https://freegeoip.net/json/" + ip, function(error, response, body) {
        var parsed = JSON.parse(body);
        city += parsed["city"];
        regionName += parsed["region_name"];
        callback({
            city: city,
            regionName: regionName
        })
        return;
    });
}

app.get("/", function(req, res) {
    var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
    getCity(ip, function(response) {
        var geoRequest = response;
        var extract = "";
        var wikiText = request("https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&indexpageids&exintro=&explaintext=&titles=" + geoRequest["city"], function(error, response, body) {
            if (!error && response.statusCode == 200) {
                var parsed = JSON.parse(body);
                var pageId = parsed["query"]["pageids"][0];
                extract = parsed["query"]["pages"][pageId]["extract"];
                if (extract.includes("refer") || extract.includes("alternative") || extract.includes("refers") || extract.includes("several") || extract === "" || extract.includes("redirects")) {
                    var secondReq = request("https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&indexpageids&exintro=&explaintext=&titles=" + geoRequest["city"] + ", " + geoRequest["regionName"], function(error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var parsed = JSON.parse(body);
                            var pageId = parsed["query"]["pageids"][0];
                            extract = parsed["query"]["pages"][pageId]["extract"];
                            res.render("index", {
                                city: geoRequest["city"] + ", " + geoRequest["regionName"],
                                text: extract
                            });
                        }
                    }); 
                } else {
                    res.render("index", {
                        city: geoRequest["city"],
                        text: extract
                    });
                }
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