var configFile = require('./config.json');
var commander = require("commander");
var oQuery = require("o-query");

/*
	Command-line params
*/
function reducer(raw, arr) {
	var splitted = raw.split(/\s*=\s*/);
	var pointer = "/" + splitted[0].replace(".", "/");
	var value = splitted[1];
	if (/^[\d\.]+$/.test(value)) {
		value = +value;
	} else if (value == "true" || value == "false") {
		value = (value == "true");
	} else if ((value[0] == "[" && value[value.length - 1] == "]") || (value[0] == "{" && value[value.length - 1] == "}")) {
		try {
		eval("value = " + value);
		} catch (err) {
			throw new Error("Can't parse \"" + value + "\" in -o/--overwrite params");
		}
	}

	arr.push({ pointer: pointer, value: value });
	return arr;
}

commander
	.option('-o, --overwrite [pairs]', 'Overwrite config params', reducer, [])
	.parse(process.argv);

commander.overwrite.forEach(function (param) {
	oQuery.set(param.pointer, param.value, configFile);
});

module.exports = configFile;
