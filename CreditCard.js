var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');

var content = fs.readFileSync('/Users/andhyk/CreditCard/KartuKreditList.html');
var $ = cheerio.load(content);

var cards = [];

$('.content tr.card').each(function () {
    var t = $(this);
    var imageUrl = t.find('.img img').attr('src');
    var cardname = t.find('.summary [itemprop="name"] a').text();
    var brand = t.find('.summary [itemprop="brand"]').attr('content');
    var description = t.find('.summary [itemprop="description"]').text();
    var interestRate = t.find('[data-column="Interest Rate"] dd').text();
    var cashbackText = t.find('[data-column="Cashback"] dd').text();
    var annualFee = t.find('[data-column="Annual Fee"] dd').text();
    var minIncome = t.find('[data-column="Min. Annual Income"] dd').text();
    var detailurl = t.find('.calltoaction a:first-child').attr('href');

    var data = {
        name: cardname,
        imageUrl: imageUrl,
        brand: brand,
        description: description,
        interestRate: interestRate,
        cashbackText: cashbackText,
        annualFee: annualFee,
        minIncome: minIncome,
        detailUrl: detailurl
    };

    cards.push(data);

    var dataTxt = JSON.stringify(data);

    console.log('%s \n', dataTxt);
});

var ScrapeCreditCard = {

    processCardDetail : function (err, resp, body) {
        console.log('processing '+ resp.request.path);
        if (err) {
            throw err;
        }

        var $ = cheerio.load(body);

        var cardDetail = {
            features: [],
            cost: {
                annualFee: '',
                annualFeePromo: '',
                additionalCardAnnualFee: 0,
                lateFee: '',
                lateFeeAdmin: '',
                minMontlyPayment: ''
            },
            termAndCondition: {
                minIncome: '',
                minAgeFirstHolder: '',
                maxAgeFirstHolder: '',
                minHolderForAdditionalCard: '',
                recidencyRequirement: ''
            },
            review: ''
        };

        var productFeesMapping = [];
        productFeesMapping['Biaya Tahunan'] = 'minIncome';
        productFeesMapping['Biaya tahunan untuk kartu tambahan'] = 'additionalCardAnnualFee';
        productFeesMapping['Denda keterlambatan pembayaran'] = 'lateFee';
        productFeesMapping['Biaya admin untuk keterlambatan'] = 'lateFeeAdmin';
        productFeesMapping['Minimal pembayaran setiap bulan'] = 'minMontlyPayment';


        var termsMapping = [];
        termsMapping['Minimal pendapatan tahunan'] = 'minIncome';
        termsMapping['Umur minimal untuk pemegang kartu utama'] = 'minAgeFirstHolder';
        termsMapping['Umur maksimal untuk pemegang kartu utama'] = 'maxAgeFirstHolder';
        termsMapping['Umur minimal untuk pemegang kartu tambahan'] = 'minHolderForAdditionalCard';
        termsMapping['Siapa saja yang bisa mendaftar'] = 'recidencyRequirement';

        $('.card-features dt').each(function () {
            var label = $(this).text();
            var description = $(this.next).text();

            cardDetail.features.push({
                label: label,
                desc: description
            });
        });


        $('.product-fees dt').each(function () {
            var label = $(this).text();

            if (label == 'Biaya Tahunan') {
                var valueNode = $(this.next);
                cardDetail.cost.annualFee = valueNode.text();
                cardDetail.cost.annualFeePromo = valueNode.find('ul').text();
                return;
            }

            var field = productFeesMapping[label];
            if (field) {
                var valueNode = $(this.next);
                cardDetail.cost[field] = valueNode.text();
            } else {
                console.error("Error: unspecified field %s \n", label);
            }
        });


        $('.product-requirements dt').each(function () {
            var label = $(this).text();

            var field = termsMapping[label];
            if (field) {
                var valueNode = $(this.next);
                cardDetail.termAndCondition[field] = valueNode.text();
            } else {
                console.error("Error: unspecified termAndCondition field %s \n", label);
            }
        });

        var review = $('.card-review article').html();
        cardDetail.review = review;

        var name = $('.hero-card [itemprop="name"]').text();
        if (name) {
            console.log("json:%s \n\n", JSON.stringify(cardDetail));

            var matchedCard = _.findWhere(cards, {name: name});
            if (matchedCard){
                matchedCard.cardDetail = cardDetail;
            } else {
                console.error('unable to find card %s \n', name);
            }
        } else {
            console.error('unable to find card %s \n', name);
        }
    },
    processCard: function (card, callback) {

        var detailUrl = card.detailUrl;
        if (detailUrl) {

            var fileName = card.name + '.html';
            var path = "/Users/andhyk/CreditCard/" + fileName;

            if (fs.existsSync(path)) {
                fs.unlink(path, function (err) {
                    if (err) {
                        throw err;
                    }
                    console.log("deleted %s \n", path);
                });
            }

            console.info('processing %s', detailUrl);

            request.get(detailUrl, function (err, resp, body) {
                ScrapeCreditCard.processCardDetail(err, resp, body);
                callback();

            }).pipe(fs.createWriteStream(path));
        }
    }
};

console.log('processing async for %s cards\n', cards.length);
async.each(cards, ScrapeCreditCard.processCard.bind(ScrapeCreditCard), function(err){
    console.log('processing async for %s cards - CALLBACK\n', err);
    if(err){
        throw err;
    }

    var allCardData = JSON.stringify(cards);
    var allCardDataPath = '/Users/andhyk/CreditCard/KreditCardAllData.json';
    if (fs.existsSync(allCardDataPath)) {
        fs.unlinkSync(allCardDataPath);
    }

    fs.writeFileSync(allCardDataPath, allCardData);
});

console.log('processing async for %s cards - DONE\n', cards.length);



