var path = require('path');
var fs = require('fs');

function Log() {
	this.accessLog = null;
	this.fetchLog = null;
	this.errorLog = null;
	this.debugLog = null;

	// save off real console logging to console.original
	if(!console.original) {
		console.original = {
			log: console.log,
			info: console.info,
			warn: console.warn,
			error: console.error
		};

	}

	// override built in console logging with new versions
	console.log = console.debug = this.debug.bind(this);
	console.access = this.access.bind(this);
	console.fetch = this.fetch.bind(this);
	console.info = this.info.bind(this);
	console.warn = this.warn.bind(this);
	console.error = this.error.bind(this);
}

// configure log singleton and open log streams
Log.prototype.init = function(config){
	var mode = 0664;
	this.config = config;

	this.accessLog = config.logs.access ?
		fs.createWriteStream(path.resolve(__dirname, '..', this.config.logs.access), {flags:'a', mode: mode }) : null;

	this.fetchLog = config.logs.fetch ?
		fs.createWriteStream(path.resolve(__dirname, '..', this.config.logs.fetch), {flags:'a', mode: mode }) : null;

	this.errorLog = config.logs.error ?
		fs.createWriteStream(path.resolve(__dirname, '..', this.config.logs.error), {flags:'a', mode: mode }) : null;

	this.debugLog = config.logs.debug ?
		fs.createWriteStream(path.resolve(__dirname, '..', this.config.logs.debug), {flags:'a', mode: mode }) : null;
};

Log.prototype.setStats = function(stats){
	this.stats = stats;
};

// do a async log to a stream. fall back to old console log on error
Log.prototype.log = function(stream, time){
	var args = Array.prototype.slice.call(arguments, 2);
	if(!stream) { stream = this.debugLog; }
	if(!stream) { return false; }
	if(!time){ time = Date.now(); }
	var line = '['+(new Date(time)).toUTCString()+'] '+args.join(' ')+'\n';
	try {
		stream.write(line, function (err) {
			if(err) {
				console.original.error('Log writing error:', err.message||err, '\n', line);
			}
		});
	}catch(err) {
		console.original.error('Log writing error:', err.message||err, '\n', line);
	}
	return true;
};

// sugar for logging to various streams. fall back to console log if logging failed
Log.prototype.access = function(){
	var args = Array.prototype.slice.call(arguments);
	if(!this.log.apply(this, [this.accessLog, null].concat(args))) {
		console.original.log.apply(console, args);
	}
};
Log.prototype.fetch = function(){
	var args = Array.prototype.slice.call(arguments);
	if(!this.log.apply(this, [this.fetchLog, null].concat(args))) {
		console.original.log.apply(console, args);
	}
};
Log.prototype.debug = function(){
	var args = Array.prototype.slice.call(arguments);
	if(!this.log.apply(this, [this.debugLog, null, 'DEBUG'].concat(args))) {
		console.original.log.apply(console, args);
	}
};
Log.prototype.info = function(){
	var args = Array.prototype.slice.call(arguments);
	if(!this.log.apply(this, [this.debugLog, null, 'INFO'].concat(args))) {
		console.original.info.apply(console, args);
	}
};
Log.prototype.warn = function(){
	var args = Array.prototype.slice.call(arguments);
	for(var i=0; i<args.length; i++) {
		// special case for warning Error instances
		if(args[i] instanceof Error) {
			var err = args[i];
			var errorType = err.kind||'?';
			var errorSource = err.source||'?';
			var message = err.message;
			if(err.logged) {
				message = message += '[DUPLICATE]';
			}
			args[i] = errorType+'@'+errorSource+': '+message;
			err.logged = true;
		}
	}
	if(!this.log.apply(this, [this.debugLog, null, 'WARN'].concat(args))){
		console.original.warn.apply(console, args);
	}
};
Log.prototype.error = function(){
	var args = Array.prototype.slice.call(arguments);
	for(var i=0; i<args.length; i++) {
		// special case for warning Error instances
		if(args[i] instanceof Error) {
			var err = args[i];
			var errorType = err.kind||'?';
			var errorSource = err.source||'?';
			var message = err.stack || err.message;
			if(errorType === 'client' || errorType === 'upstream') { message = err.message; }
			// check for duplicate logging
			if(err.logged) {
				message = message += ' [DUPLICATE]';
			}

			args[i] = errorType+'@'+errorSource+': '+message+(err.url?' url: '+err.url:'');

			// log this error to statistics
			if(!err.logged && this.stats) {
				this.stats.reportError(errorType, errorSource, message);
			}

			err.logged = true;
		}
	}

	// write this error to logs
	if(!this.log.apply(this, [this.errorLog, null, 'ERROR'].concat(args))) {
		console.original.error.apply(console, args);
	}
};

// create log singleton
module.exports = new Log();
