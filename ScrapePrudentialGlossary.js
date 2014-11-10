var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var xml2js = require('xml2js');

var glossaryUrl = "http://www.prudential.co.id/corp/prudential_in_id/solutions/Daftar-Istilah-Asuransi-Jiwa/Daftar-Istilah-Asuransi-Jiwa-Non-Syariah.html";
var glossaryPath = "/Users/andhyk/KreditGoGo/glossary-insurance-non-syariah.json";

var glossarySyariahUrl = "http://www.prudential.co.id/corp/prudential_in_id/solutions/Daftar-Istilah-Asuransi-Jiwa/Daftar-Istilah-Asuransi-Jiwa-Syariah.html";
var glossarySyariahPath = "/Users/andhyk/KreditGoGo/glossary-insurance-syariah.json";

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

var parsePrudentialGlorsaryPage = function (glossaryUrl, glossaryPath) {
    var glossary = [];
    request.get(glossaryUrl, function (err, resp, body) {
        var $ = cheerio.load(body);

        $('table.MsoNormalTable tr').each(function () {
            var nodes = $(this).find("td");
            if (nodes.length >= 2) {
                var keywordNode = $(nodes[0]);
                var definitionNode = $(nodes[1]);

                var keyword = keywordNode.text().replace('\n', '').trim();
                var definition = definitionNode.text().replace('\n', '').trim();

                if (!_.isEmpty(keyword) && !_.isEmpty(definition)) {
                    glossary.push({
                        keyword: keyword,
                        definition: definition
                    });
                } else {
                    console.error("ERROR: keyword:%s defintion:%s", keyword, definition);
                }
            } else {
                console.error("ERROR: nodes are less than 2");
            }
        });

        writeFile(glossaryPath, glossary);
    });
};

parsePrudentialGlorsaryPage(glossaryUrl, glossaryPath);
parsePrudentialGlorsaryPage(glossarySyariahUrl, glossarySyariahPath);

