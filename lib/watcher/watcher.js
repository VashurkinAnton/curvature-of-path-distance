var fs = require("fs");
var globby = require("globby");
var debounce = require("debounce");
var child = require('child_process');
var moment = require("moment");
var chalk = require("chalk");
var terminate = require('terminate');

debugLog = function () {
	console.log(moment().format("hh:mm:ss: ") + [].slice.call(arguments).join(" "));
}

function shallowCopyObj(obj) {
	var copy = {};
	for (var key in obj) {
		copy[key] = obj[key];
	}
	return copy;
}

var isShAvailableOnWin = undefined;
function checkShAvailableOnWin() {
	try {
		var stat = fs.statSync("/bin/sh.exe");
	} catch (err) {
		return false;
	}
	return true;
}

function exec(cmd, options) {
	if (options.shell === true) {
		if (process.platform === 'win32') {
			if (isShAvailableOnWin === undefined) {
				isShAvailableOnWin = checkShAvailableOnWin();
				if (isShAvailableOnWin && options.debug) {
					debugLog("Will use " + chalk.yellow("'C:\\\\bin\\\\sh.exe'") + " as default shell.");
				}
			}

			if (isShAvailableOnWin) {
				var childRunning = child.spawn("/bin/sh", ["-c", cmd], { stdio: options.writeToConsole ? "inherit" : null });
			} else {
				var childRunning = child.spawn(cmd, { shell: true, stdio: options.writeToConsole ? "inherit" : null });
			}
		} else {
			var childRunning = child.spawn(cmd, { shell: true, stdio: options.writeToConsole ? "inherit" : null });
		}
	} else if (typeof(options.shell) === "string") {
		var shellExecutable = options.shell.split(" ")[0];
		var childRunning = child.spawn(shellExecutable, options.shell.split(" ").slice(1).concat([cmd]), { stdio: options.writeToConsole ? "inherit" : null });
	}

	return childRunning;
}

function preprocessGlobPatters(patterns) {
	if (!Array.isArray(patterns)) {
		patterns = patterns.split(",");
	}
	var additional = [];
	patterns.forEach(function (p) {
		if (p.startsWith("!") && !p.endsWith("**/*")) {
			if (p.endsWith("/")) {
				additional.push(p+"**/*");
			} else {
				additional.push(p+"/**/*");
			}
		}
	});
	return patterns.concat(additional);
}

var _watcherId = 0;
function watcherId() {
	return _watcherId++;
}

function Watcher(globs, ruleOptions, cmdOrFun) {
	if (!(this instanceof Watcher)) {
		if (arguments.length === 1) {
			return new Watcher(arguments[0]);
		} else if (arguments.length === 2) {
			return new Watcher(arguments[0], arguments[1]);
		} else {
			return new Watcher(arguments[0], arguments[1], arguments[2]);
		}
	}

	var ruleOptions;
	if (arguments.length === 1) {
		ruleOptions = shallowCopyObj(arguments[0]);
	} else if (arguments.length === 2) {
		ruleOptions = {};
		ruleOptions.globPatterns = arguments[0];
		ruleOptions.cmdOrFun = arguments[1];
	} else {
		ruleOptions = shallowCopyObj(ruleOptions);
		ruleOptions.globPatterns = globs;
		ruleOptions.cmdOrFun = cmdOrFun;
	}

	this._ruleOptions = ruleOptions;
	if (!this._ruleOptions.type) {
		this._ruleOptions.type = "restart";
	}
}

Watcher.prototype.start = function () {
	if (this._started) {
		throw new Error("Process already started");
	}
	this._watchers = {};

	this._childRunning = null;
	var restart = function (err) {
		if(err && this._childRunning){
			debugLog(chalk.red("Terminating error:"), err.message);
			debugLog(chalk.green("Kill"), this._ruleOptions.cmdOrFun.toString().slice(0, 50));
			this._childRunning.kill(this.getOption("killSignal"));

			return restart();
		}

		if (this._childRunning) {
			if (this.getOption("debug")) {
				debugLog(chalk.green("Terminate"), this._ruleOptions.cmdOrFun.toString().slice(0, 50));
			}
			terminate(this._childRunning.pid, { pollInterval: this.getOption("terminatePollInterval"), timeout: this.getOption("terminateTimeout") }, restart);
			return;
		}
		if (this.getOption("debug")) {
			debugLog(chalk.green("Restart"), this._ruleOptions.cmdOrFun.toString());
		}
		this._childRunning = exec(this._ruleOptions.cmdOrFun, {
			writeToConsole: this.getOption("writeToConsole"),
			shell: this.getOption("shell"),
			debug: this.getOption("debug")
		});
		this._childRunning.on("exit", function (code) {
			if (!this._childRunning.killed) { // not killed
				this._childRunning = null;
				if (this.getOption("restartOnSuccess") && code === 0) {
					restart();
				}
				if (this.getOption("restartOnError") && code !== 0) {
					restart();
				}
			} else {
				this._childRunning = null;
			}
		}.bind(this));
	}.bind(this);

	var firstTime = true;
	var reglob = function () {
		var paths = globby.sync(preprocessGlobPatters(this._ruleOptions.globPatterns));
		paths.forEach(function (p) {
			if (!this._watchers[p]) {
				var execCallback = debounce(function (action) {
					if (this._ruleOptions.type === "exec") {
						if (typeof(this._ruleOptions.cmdOrFun) === "function") {
							this._ruleOptions.cmdOrFun(p, action);
						} else {
							this._childRunning = exec(this._ruleOptions.cmdOrFun, {
								writeToConsole: this.getOption("writeToConsole"),
								shell: this.getOption("shell"),
								debug: this.getOption("debug")
							});
							this._childRunning.on("exit", function () {
								this._childRunning = null;
							}.bind(this));
						}
					} else if (this._ruleOptions.type === "restart") {
						restart();
					}
				}.bind(this), this.getOption("debounce"));

				var rewatch = function () {
					if (this._watchers[p]) {
						if (this.getOption("debug")) {
							debugLog(chalk.red("Deleted")+" watcher: path="+chalk.yellow(p)+" id="+this._watchers[p].id);
						}
						this._watchers[p].close();
					} else {
					}
					try {
						var stat = fs.statSync(p);
						var mtime = stat.mtime;
					} catch (err) {
						return setTimeout(reglob, 0);
					}
					this._watchers[p] = fs.watch(p, function (action) {
						if (this.getOption("debug")) {
							debugLog(chalk.green("Fire")+" watcher: path="+chalk.yellow(p)+" id="+this._watchers[p].id+" action="+action);
						}
						try {
							stat = fs.statSync(p);
						} catch (err) {
							if (err.code == "ENOENT") {
								return execCallback("remove");
							}
						}
						if (action == "rename") {
							setTimeout(rewatch, 0);
						}

						if (this.getOption("mtimeCheck")) {
							if (stat.mtime > mtime) {
								execCallback(action);
								mtime = stat.mtime;
							}
						} else {
							execCallback(action);
						}
					}.bind(this));
					if (this.getOption("debug")) {
						this._watchers[p].id = watcherId();
						debugLog(chalk.green("Created")+" watcher: path="+chalk.yellow(p)+" id="+this._watchers[p].id);
					}
				}.bind(this);

				rewatch();

				if (!firstTime) {
					execCallback("create");
				}
			}
		}.bind(this));

		Object.keys(this._watchers).forEach(function (p) {
			if (paths.indexOf(p) == -1) {
				if (this.getOption("debug")) {
					debugLog(chalk.red("Deleted")+" watcher: path="+chalk.yellow(p)+" id="+this._watchers[p].id);
				}
				this._watchers[p].close();
				delete this._watchers[p];
			}
		}.bind(this));

		if (firstTime && this._ruleOptions.type === "restart") {
			restart();
		}
		firstTime = false;
	}.bind(this);

	reglob();

	this._started = true;
	this._reglobInterval = setInterval(reglob, this.getOption("reglob"));
	return this;
};

Watcher.prototype.options = function () {
	return this._ruleOptions;
}

Watcher.prototype.getOption = function (name) {
	if (this._watcher) {
		return [this._ruleOptions[name], this._watcher._globalOptions[name], defaultOptions[name]].find(function (v) {
			return v != null;
		});
	} else {
		return [this._ruleOptions[name], defaultOptions[name]].find(function (v) {
			return v != null;
		});
	}
};

Watcher.prototype.stop = function () {
	if (this._started) {
		if (this._childRunning) {
			terminate(this._childRunning.pid, { pollInterval: this.getOption("terminatePollInterval"), timeout: this.getOption("terminateTimeout") }, function () {
				this._childRunning = null;
			});
		}
		clearInterval(this._reglobInterval);
		this._reglobInterval = null;
		Object.keys(this._watchers).forEach(function (p) {
			this._watchers[p].close();
			delete this._watchers[p];
		}.bind(this));
		this._started = false;
	}
};

Watcher.prototype.restart = function () {
	this.stop();
	this.start();
};

Watcher.prototype.toJSON = function () {
	var ruleOptionsCopy = JSON.parse(JSON.stringify(this._ruleOptions));
	if (typeof(this._ruleOptions.cmdOrFun) === "function") {
		ruleOptionsCopy.cmdOrFun = "<FUNCTION>";
	}
	ruleOptionsCopy.started = this._started;
	ruleOptionsCopy.id = this.id;
	return ruleOptionsCopy;
};

Watcher.prototype.delete = function () {
	this.stop();
	var index = this._watcher._rules.indexOf(this);
	this._watcher._rules.splice(index, 1);
	if (this.getOption("debug")) {
		debugLog(chalk.green("Delete rule"), "index="+index);
	}
};

var defaultOptions = {
	debounce: 500, // exec/reload once in ms at max
	reglob: 2000, // perform reglob to watch added files
	//queue: true, // exec calback if it's already executing
	restartOnError: false, // restart if exit code != 0
	restartOnSuccess: false, // restart if exit code == 0
	shell: true, // use this shell for running cmds, or default shell(true)
	//cwd: "path for resolving",
	//persistLog: true, // save logs in files
	//logDir: "./logs",
	//logRotation: "5h", // s,m,h,d,M
	killSignal: "SIGTERM", // used if package terminate will return error
	writeToConsole: true, // write logs to console
	mtimeCheck: true,
	debug: false,
	terminatePollInterval: 200,
	terminateTimeout: 2000
};

module.exports.Watcher = Watcher;