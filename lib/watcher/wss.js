var config = require('../../config');
var chalk = require('chalk');
var path = require('path');

if(config.watch && config.watch.enable){
	var updateTypes = {
		'.less': 'style',
		'.css': 'style',
		'.lesse': 'style',
		'.html': 'page',
		'.js': 'code'
	}
	var wss = require("ws").Server({ port: config.watch.port });
	var watcher = new require('./watcher.js').Watcher({
		type: 'exec',
		debug: false,
		debounce: config.watch.debounce || 500, // exec/reload once in ms at max
		reglob: config.watch.reglob || 2000, // perform reglob to watch added files
		globPatterns: config.watch.globPatterns,
		cmdOrFun: function(filename, event){
			if(event === 'change' || event === 'rename'){
				var updateType = updateTypes[path.extname(filename)];

				if(updateType){
					filename = filename.replace(/[^]+?\/static/, '');

					if(updateType === 'page'){
						filename = filename.replace(/^\/pages/, '');
					}

					wss.clients.forEach(function(client){
						client.send(JSON.stringify({
							event: event,
							type: updateType,
							filename: filename
						}));
					});
				}
			}
		}
	});

	watcher.start();

	console.log(chalk.yellow('Developing tool: Watcher started on ' + config.watch.port + ' port.'));
}
