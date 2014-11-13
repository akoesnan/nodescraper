var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var xml2js = require('xml2js');

var creditCardPromoBaseUrl = "http://www.serbapromosi.co/kartu-kredit";
var serbaPromosiPath = "/Users/andhyk/KreditGoGo/serbapromosi.json";

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

var parseSerbaPromosi = function (promoUrl, qs, callback) {
    request.get(promoUrl, {qs: qs}, function (err, resp, body) {
        var $ = cheerio.load(body);
        var lastPromo;

        $('table.contentpaneopen_news').each(function (index) {
            if (index % 2 == 0) {
                // title
                var title = $(this).find('.contentheading_news a');

                var url = title.attr('href');
                var name = title.text();
                console.log('processing promotion %s', name);
                var p = {name: name, url: url};
                lastPromo = p;
                promotions.push(p);
            } else {
                var p = lastPromo;
                var imgUrl = $(this).find('img').attr('src');
                p.imageUrl = imgUrl;
                var shouldClickThrough = $(this).find('.readon_news');
                if (shouldClickThrough.length == 0) {
                    var description = $(this).find('.list-thumb').html();
                    p.description = description;
                } else {
                    // if this is not the full thing, we need to click through to get the full content
                    var url = "http://www.serbapromosi.co" + p.url;
                    console.log('processing %s', url);
                    request.get(url, function (err, resp, body) {
                        var $ = cheerio.load(body);
                        p.description = $($('.contentpaneopen_news p')[1]).html()
                    });
                }
            }
        });

        callback();
    });
};

var pages = _.range(0, 150, 10);
async.eachLimit(pages, 5, function (page, cb) {
    var qs = {start: page};
    parseSerbaPromosi(creditCardPromoBaseUrl, qs, cb);
}, function (err, result) {
    writeFile(serbaPromosiPath, promotions);
});