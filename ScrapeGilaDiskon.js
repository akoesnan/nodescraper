var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var xml2js = require('xml2js');

var creditCardPromoBaseUrl = "http://www.giladiskon.com/deal/tag/Kartu%20Kredit/active";
var katalogPromosiPath = "/Users/andhyk/KreditGoGo/gilaDiskon.json";

var deleteFileIfExists = function (filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
};

var writeFile = function (filePath, data) {
    var dataJson = JSON.stringify(data);

    deleteFileIfExists(filePath);
    console.info("writing data to %s \n", filePath);
    fs.writeFileSync(filePath, dataJson);
};

var promotions = [];

var parseGilaDiskon = function (promoUrl, qs, callback) {
    console.log("processing " + promoUrl);
    request.get(promoUrl, {qs: qs}, function (err, resp, body) {
        var $ = cheerio.load(body);

        var fetchDetailTasks = [];
        $('article.node-deals').each(function () {

            // title
            var title = $(this).find('h2 a');

            var url = "http://www.giladiskon.com/" + title.attr('href');
            var name = title.text();

            var tags = []
            $(this).find('div.tag a').each(function () {
                tags.push($(this).text());
            });

            console.log('processing promotion %s', name);
            var p = {name: name, url: url, tags: tags};

            promotions.push(p);
            var fetchDetail = function (fdcb) {
                request.get(url, function (err, resp, body) {
                    console.log('processing promotion detail for %s', name);
                    var $ = cheerio.load(body);
                    // from to
                    p.imageUrl = $('.deal-photo img').attr('src');
                    p.description = $('.deal-description').html();

                    p.representative = $('.deal-representative').text();
                    p.startDate = $('.deal-start').text();
                    p.endDate = $('.deal-expiry').text();
                    p.category = $('.deal-category').text();
                    p.location = $('.deal-location').text();

                    fdcb();
                });
            }
            fetchDetailTasks.push(fetchDetail);
        });

        async.parallel(fetchDetailTasks, function (err) {
            console.log("done executing all detail");
            if (err) {
                console.error(err);
            }
            callback();
        });
    });
};

var pages = _.range(1, 43, 1);
async.eachLimit(pages, 1, function (page, cb) {
    var url = creditCardPromoBaseUrl;
    var qs = {"page": page}
    parseGilaDiskon(url, qs, cb);
}, function (err, result) {
    writeFile(katalogPromosiPath, promotions);
});