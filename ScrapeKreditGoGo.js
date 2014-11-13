var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var xml2js = require('xml2js');

var siteMapPath = "/Users/andhyk/KreditGoGo/sitemap.xml";

var siteMapUrl = "https://kreditgogo.com/sitemap.xml";
var carInsurancePath = "/asuransi-kendaraan/";
var healthInsurancePath = "/asuransi-kesehatan/";

var kreditMultiGunaPath = "/kredit-multiguna/";
var carLoanPath = "/pinjaman/kredit-motor/";
var personalLoanPath = "/pinjaman/pribadi/";
var mortgagePath = "/pinjaman/KPR-KPA/";
var creditCardPath = "/kartu-kredit/";

var productTypes = [
    {
        type: "carInsurance",
        urlPath: carInsurancePath,
        dataPath: "/Users/andhyk/KreditGoGo/carInsurance.json"
    },
    {
        type: "healthInsurance",
        urlPath: healthInsurancePath,
        dataPath: "/Users/andhyk/KreditGoGo/healthInsurance.json"
    },

    {
        type: "multiPurposeLoan",
        urlPath: kreditMultiGunaPath,
        dataPath: "/Users/andhyk/KreditGoGo/multiPurposeLoan.json"
    },
    {
        type: "carLoan",
        urlPath: carLoanPath,
        dataPath: "/Users/andhyk/KreditGoGo/carLoan.json"
    },
    {
        type: "personalLoan",
        urlPath: personalLoanPath,
        dataPath: "/Users/andhyk/KreditGoGo/personalLoan.json"
    },
    {
        type: "mortgage",
        urlPath: mortgagePath,
        dataPath: "/Users/andhyk/KreditGoGo/mortgage.json"
    },
    {
        type: "creditCard",
        urlPath: creditCardPath,
        dataPath: "/Users/andhyk/KreditGoGo/creditCard.json"
    }
];

var products = [];


if (fs.existsSync(siteMapPath)) {
    fs.unlink(siteMapPath, function (err) {
        if (err) {
            throw err;
        }
        console.log("deleted %s \n", siteMapPath);
    });
}

var getAllProductUrls = function (sitemap, productPath) {
    var urls = sitemap.urlset.url;
    return _.chain(urls).filter(function (url) {
        var currentUrl = url.loc[0];
        return currentUrl.indexOf(".html") > 0 && currentUrl.indexOf(productPath) > 0;
    }).map(function (url) {
        return url.loc[0]
    }).value();
};

console.log('processing for %s \n', siteMapUrl);

var parsePage = function ($, product) {
    product.name = $('.hero h1').text();
    product.description = $('.hero h2').text();
    product.brand = $('.hero .logo-issuer-big').text();
    var features = [];
    $('.hero ul.lead li').each(function () {
        var featureDesc = $(this).text();
        var featureType = $(this).attr('data-icon');
        features.push({name: featureType, desc: featureDesc});
    });
    product.features = features;
    return product;
};

var parseInterest = function ($, product) {
    var interestDataText = $('.hero table').attr("data-tiers");
    if (interestDataText) {
        product.interestRate = JSON.parse(interestDataText);
    }
    return product;
};

var parseTermConditions = function ($, product) {
    var termsMapping = [];
    termsMapping['Pemasukan tahunan minimum'] = 'minIncome';
    termsMapping['Pendapatan tahunan minimum'] = 'minIncome';

    termsMapping['Usia minimum'] = 'minApplicantAge';
    termsMapping['Usia maksimum'] = 'minApplicantAge';
    termsMapping['Lain lain'] = 'other';
    termsMapping['Bagaimana bisa mengajukan'] = 'other';
    termsMapping['Usia Maksimum Kendaraan'] = 'maxVehicleAge';
    termsMapping['Usia Minimum Kendaraan'] = 'minVehicleAge';
    termsMapping['Minimal pendapatan tahunan'] = 'minIncome';
    termsMapping['Umur minimal untuk pemegang kartu utama'] = 'minAgeFirstHolder';
    termsMapping['Umur maksimal untuk pemegang kartu utama'] = 'maxAgeFirstHolder';
    termsMapping['Umur minimal untuk pemegang kartu tambahan'] = 'minHolderForAdditionalCard';
    termsMapping['Siapa saja yang bisa mendaftar'] = 'recidencyRequirement';


    product.requirements = {};

    $('.product-requirements dt').each(function () {
        var label = $(this).text();

        var field = termsMapping[label];
        if (field) {
            var valueNode = $(this.next);
            product.requirements[field] = valueNode.text();
        } else {
            console.error("Error: unspecified terms field %s \n", label);
        }
    });

    return product;
};

var parseCardFeatures = function ($, product) {
    var cardFeatureMapping = [];
    cardFeatureMapping['Flexi Pay'] = 'flexPayment';
    cardFeatureMapping['Rewards'] = 'rewards';
    cardFeatureMapping['Travel'] = 'travel';
    cardFeatureMapping['Petrol'] = 'petrol';
    cardFeatureMapping['Cashback'] = 'cashback';
    cardFeatureMapping['Balance Transfer'] = 'balanceTransfer';
    cardFeatureMapping['Bunga Rendah'] = 'interest';
    cardFeatureMapping['Premium'] = 'premium';

    product.cardFeatures = {};

    $('.card-features dt').each(function () {
        var label = $(this).text();

        var field = cardFeatureMapping[label];
        if (field) {
            var valueNode = $(this.next);
            product.cardFeatures[field] = valueNode.text();
        } else {
            console.error("Error: unspecified terms field %s \n", label);
        }
    });

    return product;
};

var parseFees = function ($, product) {
    var productFeesMapping = [];
    productFeesMapping['Suku Bunga / APR'] = 'apr';
    productFeesMapping['Biaya Proses'] = 'processingFee';
    productFeesMapping['Biaya Administrasi'] = 'administrationFee';
    productFeesMapping['Biaya Asuransi'] = 'insuranceFee';
    productFeesMapping['Bea Materai'] = 'stampFee';
    productFeesMapping['Biaya Pelunasan Awal'] = 'earlyPaymentFee';
    productFeesMapping['Biaya Keterlambatan'] = 'lateFee';
    productFeesMapping['Tipe Asuransi'] = 'insuranceType';
    productFeesMapping['Biaya penarikan'] = 'withdrawalFee';
    productFeesMapping['Biaya Cancel'] = 'cancelationFee';
    productFeesMapping['Biaya Tahunan'] = 'annualFee';
    productFeesMapping['Biaya tahunan untuk kartu tambahan'] = 'additionalCardAnnualFee';
    productFeesMapping['Denda keterlambatan pembayaran'] = 'lateFee';
    productFeesMapping['Biaya admin untuk keterlambatan'] = 'lateFeeAdmin';
    productFeesMapping['Minimal pembayaran setiap bulan'] = 'minMonthlyPayment';


    product.fees = {};

    $('.product-fees dt').each(function () {
        var label = $(this).text();

        var field = productFeesMapping[label];
        if (field) {
            var valueNode = $(this.next);
            product.fees[field] = valueNode.text();
        } else {
            console.error("Error: unspecified fees field %s \n", label);
        }
    });

    return product;
};

var parseCoverage = function ($, product) {
    var coverageMapping = [];
    // health
    coverageMapping['Biaya perawatan Max per hari'] = 'maxCoveragePerDay';
    coverageMapping['Biaya perawatan Max per kejadian'] = 'maxCoveragePerIncident';
    coverageMapping['Diskon keluarga'] = 'familyDiscount';
    coverageMapping['Perawatan Darurat di Luar Negeri'] = 'foreignCountries';

    //car
    coverageMapping['Mobil Derek'] = 'towing';
    coverageMapping['Roadside Assistance'] = 'roadsideAssistance';
    coverageMapping['Nomor Telepon Roadside Assistance'] = 'roadsideAssistancePhoneNumber';
    coverageMapping['Tidak Ada Klaim Diskon'] = 'noClaimDiscount';
    coverageMapping['Perlindungan Tambahan'] = 'additionalCoverage';
    coverageMapping['Pengecualian'] = 'notCovered';
    coverageMapping['Mobil Pengganti'] = 'replacementCar';


    product.coverages = {};

    $('.product-coverage dt').each(function () {
        var label = $(this).text();

        var field = coverageMapping[label];
        if (field) {
            var valueNode = $(this.next);
            product.coverages[field] = valueNode.text();
        } else {
            console.error("Error: unspecified fees field %s \n", label);
        }
    });

    return product;
};

var parseBenefits = function ($, product) {
    var benefitMapping = [];
    benefitMapping['Biaya Kamar dan Rawat Inap'] = 'maxCoverage';
    benefitMapping['Perlindungan biaya unit rawat inap'] = 'maxCoveredECU';
    benefitMapping['Perlindungan Darurat'] = 'emergencyRoom';
    benefitMapping['Benefit Kecelakaan Diri'] = 'selfIncident';
    benefitMapping['Pengeluaran Obat'] = 'medicineCoverage';
    benefitMapping['Biaya Tanggungan Operasi'] = 'operationCoverage';
    benefitMapping['Biaya Ambulans'] = 'ambulance';
    benefitMapping['Pemeriksaan Laboratorium'] = 'laboratory';
    benefitMapping['Pemeliharaan perawatan'] = 'care';
    benefitMapping['Biaya Pemeriksaan Gigi'] = 'dental';
    benefitMapping['Kunjungan Dokter Umum'] = 'familyPracticeVisit';
    benefitMapping['Kunjungan Dokter Spesialis'] = 'specializedDoctorVisit';
    benefitMapping['Biaya Layanan Anestesi'] = 'anestesic';
    benefitMapping['Cakupan biaya pasca dirawat di rumah sakit'] = 'afterSurgeryStay';
    benefitMapping['Perlindungan Perawatan di Luar Negeri'] = 'foreignCountry';
    benefitMapping['Biaya Pengobatan Mata'] = 'vision';
    benefitMapping['Perawatan bersalin'] = 'birth';
    benefitMapping['Perlindungan rawat jalan'] = 'dayCareCoverage';
    benefitMapping['Tidak ada bonus klaim'] = 'noClaimBonus';
    benefitMapping['Bedah kosmetik'] = 'cosmeticSurgery';
    benefitMapping['Imunisasi'] = 'immunization';

    product.benefit = {};

    $('.product-benefits dt').each(function () {
        var label = $(this).text();

        var field = benefitMapping[label];
        if (field) {
            var valueNode = $(this.next);
            product.benefit[field] = valueNode.text();
        } else {
            console.error("Error: unspecified benefit field %s \n", label);
        }
    });

    return product;
};


var parseReview = function ($, product) {
    product.review = {};
    product.review.summary = $('.review h4').text();
    product.review.description = $('.review article').html();
    return product;
};

var processUrl = function (url, productType, productArray, callback) {
    request.get(url, function (err, resp, body) {
        var $ = cheerio.load(body);
        var product = {
            type: productType
        };

        parsePage($, product);
        parseCardFeatures($, product);
        parseInterest($, product);
        parseTermConditions($, product);
        parseFees($, product);
        parseCoverage($, product);
        parseBenefits($, product);

        parseReview($, product);

        productArray.push(product);
        callback();
    });
};

var writeFile = function (filePath, data) {

    var dataJson = JSON.stringify(data);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    console.info("writing data to %s \n", filePath);
    fs.writeFileSync(filePath, dataJson);
};

request.get(siteMapUrl, function (err, resp, body) {
    xml2js.parseString(body, function (err, result) {

        console.log('processing sitemap.xml\n');

        async.eachSeries(productTypes, function (pt, ptcb) {
            var productArray = [];
            var urls = getAllProductUrls(result, pt.urlPath);

            async.eachSeries(urls, function (url, callback) {
                console.info('processing %s', url);
                processUrl(url, pt.type, productArray, callback);

            }, function (err) {
                if (err) {
                    throw err;
                }

                console.log("writing %s data", pt.type);
                writeFile(pt.dataPath, productArray);
                ptcb();
            });
        });

    });
}).pipe(fs.createWriteStream(siteMapPath));

console.log('processing for %s -DONE\n', siteMapUrl);



