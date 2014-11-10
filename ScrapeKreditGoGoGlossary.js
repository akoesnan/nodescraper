var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var xml2js = require('xml2js');

var glossaryUrl = "https://kreditgogo.com/istilah-perbankan.html";
var glossaryPath = "/Users/andhyk/KreditGoGo/glossary.json";

var glossary = [];

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

request.get(glossaryUrl, function (err, resp, body) {
    var $ = cheerio.load(body);

    $('.glossary-list li dl dt').each(function () {
        var keyword = $(this).text();
        var definition = $(this.next).text();

        if (!_.isEmpty(keyword) && !_.isEmpty(definition)) {
            glossary.push({
                keyword: keyword,
                definition: definition
            });
        } else {
            console.error("ERROR: keyword:%s defintion:%s", keyword, definition);
        }
    });

    writeFile(glossaryPath, glossary);
});





