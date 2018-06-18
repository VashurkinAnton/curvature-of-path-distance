var path = require("path");
var fs = require("fs");
var globby = require("globby")

var express = require("express");
var bodyParser = require("body-parser");
var timeout = require("connect-timeout")
var compression = require('compression');

var staticCompiler = require('express-static-compiler');
var oQuery = require("o-query");
var ejs = require('ejs');

var less = require('less');
var autoprefixer = require('autoprefixer');
var postcss = require('postcss');

var chalk = require("chalk");

var config = require('./config');
var app = express();

if (oQuery.get('ssl/enable', config)) {
    var fs = require('fs');
    var https = require("https");

    try {
        var privateKey = fs.readFileSync(oQuery.get('ssl/privateKey', config));
    } catch (err) {
        console.error(chalk.red("Error reading privateKey \"" + path.resolve(oQuery.get('ssl/privateKey', config)) + "\""));
        process.exit(1);
    }

    try {
        var certificate = fs.readFileSync(oQuery.get('ssl/certificate', config));
    } catch (err) {
        console.error(chalk.red("Error reading certificate \"" + path.resolve(oQuery.get('ssl/certificate', config)) + "\""));
        process.exit(1);
    }
    try {
        var server = https.createServer({
            key: privateKey,
            cert: certificate,
            passphrase: oQuery.get('ssl/passphrase', config)
        }, app);
    } catch (err) {
        console.error(chalk.red("Error reading certificate \"" + path.resolve(oQuery.get('ssl/certificate', config)) + "\""));
        process.exit(1);
    }

    console.log(chalk.green('Enabled SSL'));
} else {
    var server = app;
}

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(timeout(120000));

// Run time compilation for less files

app.set('view engine', 'html');
app.engine('html', ejs.renderFile);

app.set('views', './static/pages');

app.use(['/', /\.html$/g], function(req, res, next) {
    var url = req.originalUrl.split('?')[0].split('#')[0];

    if (url === '/' || /\.html$/g.test(url)) {
        var templateName = url.replace(/^\//, '');
        templateName = templateName.split('.');
        templateName.pop();
        templateName = templateName.join('');

        res.render(templateName || 'index', { config: config, query: req.query, body: req.body });
    } else {
        next();
    }
});

app.use('/vendor', express.static(path.resolve("./static/vendor")));
app.use(staticCompiler('./static', {
    extensions: [".less", ".css"],
    processor: function(data, callback, filename) {
        less.render(data, { sourceMap: true }).then(function(output) {
            postcss([autoprefixer]).process(output.css, { from: false }).then(function(postProcessed) {
                callback(null, postProcessed.css);
            }, function(error) {
                console.warn("POSTCSS WARN:", "<" + filename + ">", error.reason);
                callback(null, output.css);
            });

        }, function(error) {
            callback(e, null);
        })
    },
    setHeaders: function(res) {
        res.set('Content-Type', 'text/css');
    }
}));


app.use(staticCompiler('./static', {
    extensions: [".ejsless"],
    processor: function(data, callback, filename) {
        var lessStyle;
        try {
            lessStyle = ejs.render(data, {}, { filename: filename })
        } catch (e) {
            return callback(e);
        }

        less.render(lessStyle, { sourceMap: true }).then(function(output) {
            postcss([autoprefixer]).process(output.css, { from: false }).then(function(postProcessed) {
                callback(null, postProcessed.css);
            }, function(error) {
                console.warn("POSTCSS WARN:", "<" + filename + ">", error.reason);
                callback(null, output.css);
            });

        }, function(error) {
            error.input = lessStyle;
            callback(error, null);
        })
    },
    setHeaders: function(res) {
        res.set('Content-Type', 'text/css');
    }
}));

app.use(express.static(path.resolve("./static")));
app.use('/lib', express.static(path.resolve("./lib")));

if (config.watch && config.watch.enable) {
    require('./lib/watcher/wss.js');
}

server.listen(process.env.PORT || config.port, function() {
    console.log(chalk.green("Service started on port " + (process.env.PORT || config.port) + "."));
}).on('error', function(err) {
    console.log(chalk.red("Can't start server on port \"" + (process.env.PORT || config.port) + "\". Error ") + "\"" + err.message + "\"");
    process.exit(1);
});
