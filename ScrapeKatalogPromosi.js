var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var xml2js = require('xml2js');

var creditCardPromoBaseUrl = "http://katalogpromosi.com/category/bankkartu-kredit/page/";
var katalogPromosiPath = "/Users/andhyk/KreditGoGo/katalogpromosi2.json";

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

var parseSerbaPromosi = function (promoUrl, callback) {
    console.log("processing " + promoUrl);
    request.get(promoUrl, function (err, resp, body) {
        var $ = cheerio.load(body);

        var fetchDetailTasks = [];
        $('article.post').each(function () {

            // title
            var title = $(this).find('h3.loop-title a');

            var url = title.attr('href');
            var name = title.text();

            // img
            var imgUrl = $(this).find('.loop-thumb img').attr('src');

            console.log('processing promotion %s', name);
            var p = {name: name, url: url, imageUrl: imgUrl};

            promotions.push(p);
            var fetchDetail = function (fdcb) {
                request.get(url, function (err, resp, body) {
                    console.log('processing promotion detail for %s', name);
                    var $ = cheerio.load(body);
                    // from to

                    var dates = $('.post-meta .updated');
                    if (dates.length == 2) {
                        console.info("setting promotion date for %s", p.name);
                        p.startDate = $(dates[0]).text();
                        p.endDate = $(dates[1]).text();
                    }

                    try {
                        console.info("setting detail for %s", p.name);
                        p.description = $('div.entry').html();
                    } catch (err) {
                        console.error(err);
                    }
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

var pages = _.range(1, 20, 1);
async.eachLimit(pages, 5, function (page, cb) {
    var url = creditCardPromoBaseUrl + page;
    parseSerbaPromosi(url, cb);
}, function (err, result) {
    writeFile(katalogPromosiPath, promotions);
});