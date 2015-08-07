
var url = require('url');
// var zlib = require('zlib');
var utils = require('./utils');
var http_status_codes = require('./httpstatuscodes.json');

// var lastGarbageCollection = 0;
// var minGarbageCollectionInterval = '5m'.inMS;
// function garbageCollect() {
// 	if(!global.gc) { return; }
// 	var start = +(new Date());
// 	if(start - lastGarbageCollection > minGarbageCollectionInterval) {
// 		lastGarbageCollection = start;
// 		var preMem = process.memoryUsage().heapUsed;
// 		global.gc();
// 		var postMem = process.memoryUsage().heapUsed;
// 		console.log(
// 			'Garbage collection took',utils.millisecondsToTime(+(new Date()) - start),
// 			'and freed',Math.round((preMem-postMem)/1024)+'kb',
// 			'of',Math.round(preMem/1024)+'kb'
// 		);
// 	}
// }

function APIServer(config, cb) {
// http://stackoverflow.com/questions/4886632/what-does-var-that-this-mean-in-javascript
// var colours = ['red', 'green', 'blue'];
// document.getElementById('element').addEventListener('click', function() {
//     // this is a reference to the element clicked on

//     var that = this;

//     colours.forEach(function() {
//         // this is undefined
//         // that is a reference to the element clicked on
//     });
// });

	var api_server = this;

	this.config = config;

	// this.connections = 0;
	// this.shuttingdown = false;

	// this.serverStartTime = Date.now();

	this.server = require('http').createServer();

	this.server.on('connection', function(socket) {
		socket.setTimeout(10000, function(){ socket.end(); });
		socket.setNoDelay(true);
		socket.setKeepAlive(false);
		socket.removeAllListeners('error');
		socket.on('error', function(err){
			console.error('Server socket error:',err);
			try{
				socket.end();
			} catch(e){}
		});
	});

	this.server.on('request', function(request, response){
		// api_server.connections++;
		// res.once('finish', function(){
		// 	api_server.connections--;
		// 	if(api_server.connections <= 0) {
		// 		api_server.connections = 0;
		// 		// schedule garbage collection when there are no incomming conections
		// 		if(global.gc) {
		// 			process.nextTick(garbageCollect);
		// 		}
		// 	}
		// 	// check if we are shutting down and need to say all connections are closed
		// 	if(api_server.connections === 0 && api_server.shuttingdown && api_server.shuttingdownCallback) {
		// 		return api_server.shuttingdownCallback();
		// 	}
		// });
		new APIServerConnection(api_server,request,response);
	});

	// this.server.on('error', function(err){
	// 	console.error('Server error:',err);
	// });

	this.server.listen(config.port, function(err){
		if (err) {
			throw err;
		}
		// console.access(
		// 	'Server started:',
		// 	'Env: ' + config.environment,
		// 	'Node: ' + config.serverName,
		// 	'Port: ' + config.port);

		console.log(
			'Server started : ' +
			' Env : '  + config.environment +
			' Node : ' + config.serverName +
			' Port : ' + config.port);
		
		if (typeof cb === 'function') {
			cb();
		}
	});
}

// Shutdown by stopping listening for new connections and waiting for existing connections to finish.
// timeout
// APIServer.prototype.shutdown = function(cb, timeout) {
// 	var that = this;

// 	that.shuttingdown = true;

// 	// create a callback with timeout defaulted to 10 seconds
// 	that.shuttingdownCallback = callbackTimeout(cb, timeout || 10000);

// 	// stop listening
// 	this.server.close(function(){
// 		if(that.connections === 0) {
// 			return that.shuttingdownCallback();
// 		}
// 	});

// };

// An individual connection
function APIServerConnection(server, req, res) {
	var that = this;

	// save server and response object
	this.server = server;
	this.res = res;

	// init timings
	// this.ip = req.socket.remoteAddress;
	// if(this.ip === '127.0.0.1' && req.headers['x-forwarded-for']) {
	// 	this.ip = req.headers['x-forwarded-for'];
	// }
	// this.startTime = Date.now();
	// this.responseTime = 0;
	// this.endTime = 0;
	// this.status = 0;
	// this.size = 0;
	// this.lastModified = 0;
	// this.ttl = 0;
	// this.acceptEncoding = '';

	// split up path
	var path = url.parse(req.url).path.split('/');
	this.root = path[1];
	this.apiName = path.slice(2).join('/');

	// connection counting and stats logging on connection close
	// res.once('finish', function(){
	// 	// report stats for this request
	// 	that.endTime = Date.now();
	// 	that.server.config.statsManager.reportRequest({
	// 		ip: that.ip || '-',
	// 		status: that.status || 0,
	// 		size: that.size || 0,
	// 		startTime: that.startTime || 0,
	// 		responseTime: that.responseTime || 0,
	// 		endTime: that.endTime || 0,
	// 		root: that.root || '-',
	// 		path: that.apiName || '-',
	// 		connections: that.server.connections || 0,
	// 		lastModified: that.lastModified,
	// 		ttl: that.ttl
	// 	});
	// });

	// check this was a get request
	// if(req.method !== 'GET') {
	// 	return this.sendResponse(405, this.startTime+'10s'.inMS, 0, 'Method not allowed', 'text/plain');
	// }

	// respond to request paths
	// switch(this.root) {
		// return 200 for /
		// case '':
		// 	return this.sendResponse(200, this.startTime+'1m'.inMS, 0,
		// 		'Env: '+this.server.config.environment+
		// 		'\nNode: '+this.server.config.serverName);

		// case 'api':
			// fetch headers
			// this.ifModifiedSince = req.headers['if-modified-since'] ?
			// 	+(new Date(req.headers['if-modified-since'])) : 0;
			// this.acceptEncoding = req.headers['accept-encoding'] || '';
			return this.getData(this.apiName);

		// case 'robots.txt':
		// 	return this.sendResponse(200, this.startTime+'1d'.inMS, 0, 'User-agent: *\nDisallow: /\n', 'text/plain');

	// 	default:
	// 		return this.sendResponse(404, this.startTime+'1m'.inMS, 0, {success:false,reason:'File Not Found: '+this.root});
	// }

}

// function to send a response
APIServerConnection.prototype.sendResponse = function(status, expires, lastModified, data, type) {
	var that = this;

	var now = Date.now();

	// set minimum and maximum ttls
	if(expires < now+this.server.config.minTTL) { expires = now+this.server.config.minTTL; }
	if(expires > now+this.server.config.maxTTL) { expires = now+this.server.config.maxTTL; }

	// turn expires into ttl in seconds
	this.ttl = expires - now;

	if(lastModified) { this.lastModified = lastModified; }

	if(lastModified < this.serverStartTime) { lastModified = this.serverStartTime; }

	this.responseTime = Date.now();
	if(status) { this.status = status; }
	this.res.statusCode = this.status;

	this.res.setHeader('Content-Type', type || 'application/json; charset=utf-8');
	// this.res.setHeader('X-Node', this.server.config.serverName);
	// this.res.setHeader('X-Environment', this.server.config.environment);
	// this.res.setHeader('X-API-Level', this.server.config.apiLevel);
	// this.res.setHeader('Last-Modified', utils.toDate(lastModified || Date.now()).toUTCString());
	// set expires date
	this.res.setHeader('Expires', (new Date(expires)).toUTCString());
	// tell nginx to cache for this long
	this.res.setHeader('X-Accel-Expires', ''+Math.ceil(this.ttl/1000));

// nginx likes open connections
//	this.res.setHeader('Connection', 'close');

	if(!data){
		data = '';
	}

	if(typeof data === 'object') {
		data = JSON.stringify(data);
	}

	// zip if we can
	if(this.server.config.compress && status === 200 && data && data.length > 10 && this.acceptEncoding) {
		if (this.acceptEncoding.match(/\bdeflate\b/)) {
			return zlib.deflate(data, function(err, compressed) {
				if(err) {
					err.kind = 'server';
					console.error('API Server Error deflating:',err);
					return that.sendRaw(data);
				}
				that.sendRaw(compressed, 'deflate');
			});
		} else if (this.acceptEncoding.match(/\bgzip\b/)) {
			return zlib.gzip(data, function(err, compressed) {
				if(err) {
					err.kind = 'server';
					console.error('API Server Error gzipping:',err);
					return that.sendRaw(data);
				}
				that.sendRaw(compressed, 'gzip');
			});
		}
	}

	// otherwise send data
	this.sendRaw(data);
};

// send content length, encoding and data after sending other headers
APIServerConnection.prototype.sendRaw = function(data, encoding) {
	this.size = 0;
	// if no data send empty response
	if(data === null || data === undefined) {
		this.res.setHeader('Content-Length',this.size);
		return this.res.end();
	}
	if(encoding) {
		this.res.setHeader('Content-Encoding', encoding);
	}
	if(Buffer.isBuffer(data)) {
		this.size = data.length;
	}
	if(typeof(data) === 'string') {
		this.size = Buffer.byteLength(data,'utf8');
	}
	// send data
	this.res.setHeader('Content-Length', this.size);
	this.res.end(data);
};

// function to send an error response
APIServerConnection.prototype.errorResponse = function(err) {
	console.error(err);
	var response = {
		success: false, type: err.kind || '?',
		reason: err.message || err,
		source: err.source || '?'
	};
	if(this.server.config.isDevelopment) {
		response.stack = err.stack.split('\n');
	}
	this.sendResponse(
		err.http || 500,
		this.startTime+'5s'.inMS,
		0, response);
};

// get the data from the source manager and return it to the connection with ttl set
APIServerConnection.prototype.getData = function(apiName, cb) {

	// check we are only requesting published sources if we are in any env except dev
	// var checkPublish = !this.server.config.isDevelopment;
	var checkPublish = false;

	var that = this;
	var path = ['api'];
	
	this.server.config.sourceManager.get(apiName, [path], callbackTimeout(function(err, source) {
		if (err) {
			err.kind = err.kind || 'server';
			err.source = err.source || that.apiName;
			if (cb) {
				cb(false);
			}
			return that.errorResponse(err);
		}
		if (!source) {
			err = new Error('Null source returned from source manager');
			err.kind = err.kind || 'server';
			err.source = err.source || that.apiName;
			if (cb) {
				cb(false);
			}
			return that.errorResponse(err);
		}
		if (!source.data) {
			err = new Error('Null data returned from source');
			err.kind = err.kind || 'server';
			err.source = err.source || that.apiName;
			if (cb) {
				cb(false);
			}
			return that.errorResponse(err);
		}

		if (cb) {
			cb(true);
		}

		// // check if we can just send a not-modified response to save bandwidth and time
		// if (source.lastModified && that.ifModifiedSince) {
		// 	if (that.ifModifiedSince >= source.lastModified) {
		// 		// send not-modified
		// 		return that.sendResponse(304, source.expires, source.lastModified);
		// 	}
		// }

		// if (typeof source.data === 'string') {
		// 	return that.sendResponse(200, source.expires, source.lastModified, source.data, 'text/html');
		// }

		return that.sendResponse(http_status_codes['OK'], source.expires, source.lastModified, {
			success: !!source.publish,
			expires: utils.dateToW3C(utils.toDate(source.expires || 0)),
			expiresSource: source.expiresSource || 'UNKNOWN',
			lastModified: utils.dateToW3C(utils.toDate(source.lastModified || 0)),
			data: source.data
		});
	}, that.server.config.timeout), checkPublish);
};


module.exports = APIServer;

