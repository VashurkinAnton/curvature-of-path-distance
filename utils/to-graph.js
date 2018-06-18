// Default nodejs dependencies.
var fs = require('fs');
var path = require('path');

// External dependencies.
var program = require('commander');
var cliProgress = require('cli-progress');

// Internal dependencies.
var converToGraph = require('../lib/convert-to-graph');
var availableConverTypes = ['OSM', 'Geojson'];
program.version('0.1.0')
	.option('-i, --input <fileName>', 'OSM file')
	.option('-o, --output <fileName>', 'Output file.')
	.option('-t, --type <typeName>', 'Type to conver from: ' + availableConverTypes.join(', ') + '.')
	.option('--pretty', 'Output file.')
	.parse(process.argv);

if (availableConverTypes.indexOf(program.type) === -1) {
	console.error('Can\'t open file. Error message:', e.message);
	process.exit(1);
}

try {
	var json = fs.readFileSync(path.resolve(process.cwd(), program.input), 'utf-8');
} catch (e) {
	console.error('Can\'t open file. Error message:', e.message);
	process.exit(1);
}

try {
	json = JSON.parse(json);
} catch (e) {
	console.error('Can\'t parse JSON. Error message:', e.message);
	process.exit(1);
}

var bar = new cliProgress.Bar({
	format: 'progress [{bar}] {percentage}% | {value}/{total}'
});

var graph = converToGraph['from' + program.type](json, {
	init: function(totalAmount) {
		bar.start(totalAmount, 0);
	},
	tic: function(currentAmount) {
		bar.update(currentAmount);
	},
	end: function() {
		bar.stop();
	}
});

if (program.pretty && program.output) {
	console.info('Pretty mod enabled.');
}

if (program.output) {
	console.info('Saving into file:', outputFilename);
}

var graphData = graph.stringify(null, program.pretty);

if (program.output) {
	var outputFilename = path.resolve(process.cwd(), program.output);

	try {
		fs.writeFileSync(outputFilename, graphData, 'utf-8');
	} catch (e) {
		console.error('Can\'t write file. Error message:', e.message);
		process.exit(1);
	}
} else {
	console.log(graphData);
}
