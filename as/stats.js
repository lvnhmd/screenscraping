var path = require('path');
var fs = require('fs');
var GraphViz = require('./graphviz');
var utils = require('./utils');

function Stats() {
	this.startupTime = Date.now();
	this.stats = {
		fetch: {
			socketTime: 0,
			requestingTime: 0,
			transferTime: 0,
			successCount: 0,
			notModifiedCount: 0,
			timeoutCount: 0,
			errorCount: 0,
			feeds: {}
		},
		source: {
			callingTime: 0,
			processingTime: 0,
			hitCount: 0,
			staleCount: 0,
			missCount: 0,
			errorCount: 0,
			sources: {}
		},
		api: {
			requestingTime: 0,
			transferTime: 0,
			successCount: 0,
			timeoutCount: 0,
			errorCount: 0
		}
	};
}

Stats.prototype.init = function(config){
	this.config = config;
	this.startServer();
};

Stats.prototype.startServer = function(){
	var that = this;
	// start stats server
	this.statsServer = require('http').createServer(function(req,res){
		switch(req.url) {
			case '/stats':
				try {
					res.setHeader('Content-Type','application/json');
					res.end(JSON.stringify(that.getStats()));
				} catch(e) {
					res.end(e.message);
				}
				break;
			case '/active':
				try {
					res.setHeader('Content-Type','application/json');
					res.end(JSON.stringify(that.config.sourceManager.getActiveSources()));
				} catch(e) {
					res.end(e.message);
				}
				break;
			case '/fetching':
				try {
					res.setHeader('Content-Type','application/json');
					res.end(JSON.stringify(that.config.sourceManager.getTransportSources()));
				} catch(e) {
					res.end(e.message);
				}
				break;
			case '/internal':
				try {
					var gv = new GraphViz();
					gv.fromJSON(
						{
							server: global.server,
							stats: that
						}, 'Internal Structure '+that.config.serverName);
					gv.asSVG(function(err,data){
						if(err) {
							res.setHeader('Content-Type','text/plain');
							res.end(err.stack||err.message||err);
							return;
						}
						res.setHeader('Content-Type','image/svg+xml');
						res.end(data);
					});
				} catch(e) {
					res.end(e.message);
				}
				break;

			default:
				var m = new RegExp('^/schema/(.*)$').exec(req.url);
				if(m) {
					try {
						var item = decodeURIComponent(m[1]);
						for(var i in that.config.sourceManager.sources) {
							if(that.config.sourceManager.sources[i].pattern === item) {
								item = i;
								break;
							}
						}
						that.config.sourceManager.get(item,[['precache']], function(err, source){
							if(err) {
								res.setHeader('Content-Type','text/plain');
								res.end(err.stack||err.message||err);
								return;
							}
							try {
								var gv = new GraphViz();
								gv.fromJSON({success:true, data: source.data}, 'Schema for '+source.pattern);
								gv.asSVG(function(err,data){
									if(err) {
										res.setHeader('Content-Type','text/plain');
										res.end(err.stack||err.message||err);
										return;
									}
									res.setHeader('Content-Type','image/svg+xml');
									res.end(data);
								});
							} catch(e) {
								res.end(e.message);
							}
						});
					} catch(e) {
						res.end(e.message);
					}
					return;
				}
				m = new RegExp('^/tree/(.*)$').exec(req.url);
				if(m) {
					try {
						var item = decodeURIComponent(m[1]);
						res.setHeader('Content-Type','application/json');
						res.end(JSON.stringify(that.config.sourceManager.getSourceTree(item)));
					} catch(e) {
						res.end(e.message);
					}
					return;
				}
				m = new RegExp('^/sources(/([^/]*))?(/([0-9]+))?$').exec(req.url);
				if(m) {
					try {
						var item;
						if(m[2]) {
							item = decodeURIComponent(m[2]);
						}
						var maxDepth = +m[4] || null;
						var sources = that.config.sourceManager.generateSourceMap(item, maxDepth);
						var gv = new GraphViz();
						gv.fromNodesAndEdges(sources.nodes, sources.edges, 'Sources for '+that.config.serverName);
						gv.asSVG(function(err,data){
							if(err) {
								res.setHeader('Content-Type','text/plain');
								res.end(err.stack||err.message||err);
								return;
							}
							res.setHeader('Content-Type','image/svg+xml');
							res.end(data);
						});
					} catch(e) {
						console.error(e);
						res.end(e.message);
					}
					return;
				}

				res.setHeader('Content-Type','text/html');
				res.end('<html><head><title>Stats for '+that.config.serverName+'</title></head><body>'+
					'[<a href="stats">Stats</a>] '+
					'[<a href="fetching">Fetching</a>]'+
					'[<a href="active">Active</a>]'+
					'[<a href="sources">Source Map</a>]'+
					'</body></html>');
		}
	}).on('error', function(err){
        console.error('Error from stats server', that.config.statsPort, err);
    }).listen(this.config.statsPort, function(err){
        if(err) {
            console.error('Error listening to stats port', that.config.statsPort, err);
            return;
        }
        console.info('Stats Listening on port',that.config.statsPort);
    });
};

Stats.prototype.reportError = function(type, source, message){
	// trigger error email, thresholds etc
};


// a upstream fetch is reported here. (startTime, responseTime, endTime, uri, responseCode)
Stats.prototype.reportFetch = function(item){

	item.queueMs = item.socketTime - item.startTime;
	item.remoteMs = item.responseTime - item.socketTime;
	item.transferMS = item.endTime - item.responseTime;

	console.fetch(
		'FETCH',
		item.uri,
		item.responseCode,
		'q:'+item.queueMs+'ms',
		'r:'+item.remoteMs+'ms',
		't:'+item.transferMS+'ms',
		'a:'+(item.lastModified ? utils.millisecondsToTime(item.responseTime - item.lastModified) : '-')
		);

	item.feed = item.feed || 'misc';

	var s = this.stats.fetch.feeds[item.feed];
	if(!s) {
		s = this.stats.fetch.feeds[item.feed] = {
			socketTime: 0,
			requestingTime: 0,
			transferTime: 0,
			successCount: 0,
			notModifiedCount: 0,
			timeoutCount: 0,
			errorCount: 0
		};
	}

	this.stats.fetch.socketTime += item.queueMs;
	this.stats.fetch.requestingTime += item.remoteMs;
	this.stats.fetch.transferTime += item.transferMS;
	s.socketTime += item.queueMs;
	s.requestingTime += item.remoteMs;
	s.transferTime += item.transferMS;

	if(item.responseCode === 200) {
		this.stats.fetch.successCount++;
		s.successCount++;
	}
	else if(item.responseCode === 304) {
		this.stats.fetch.notModifiedCount++;
		s.notModifiedCount++;
	}
	else if(item.responseCode === 504) {
		this.stats.fetch.timeoutCount++;
		s.timeoutCount++;
	} else {
		this.stats.fetch.errorCount++;
		s.errorCount++;
	}

};


// a request is reported here by the api server. (startTime, responseTime, endTime, ip, root, path, status, size, ttl, lastModified)
Stats.prototype.reportRequest = function(item){

	item.processingMs = item.responseTime - item.startTime;
	item.transferMS = item.endTime - item.responseTime;

	// log this request
	console.access(
		'GET',
		item.ip,
		item.root,
		item.path,
		item.status,
		item.size > 10000 ? Math.round(item.size/1024)+'kb' : item.size+'b',
		'p:'+item.processingMs+'ms',
		't:'+item.transferMS+'ms',
		'a:'+(item.lastModified ? utils.millisecondsToTime(item.responseTime - item.lastModified) : '-'),
		't:'+utils.millisecondsToTime(item.ttl)
		);

	this.stats.api.requestingTime += item.processingMs;
	this.stats.api.transferTime += item.transferMS;

	if(item.status === 200) {
		this.stats.api.successCount++;
	}
	else if(item.status === 504) {
		this.stats.api.timeoutCount++;
	} else {
		this.stats.api.errorCount++;
	}


	return item;
};

// a source is reported here (startTime, endTime, pattern, hit, stale, miss)
Stats.prototype.reportSource = function(item){

	var s = this.stats.source.sources[item.pattern];
	if(!s) {
		s = this.stats.source.sources[item.pattern] = {
			hitCount: 0,
			staleCount: 0,
			missCount: 0,
			errorCount: 0,
			processingTime: 0,
			callingTime: 0
		};
	}

	if(item.processingTime) {
		this.stats.source.processingTime += item.processingTime;
		s.processingTime += item.processingTime;
	}

	if(item.startTime) {

		if(item.hit) {
			this.stats.source.hitCount++;
			s.hitCount++;
		}
		else if(item.stale) {
			this.stats.source.staleCount++;
			s.staleCount++;
		}
		else if(item.miss) {
			this.stats.source.missCount++;
			s.missCount++;
		} else {
			this.stats.source.errorCount++;
			s.errorCount++;
		}

		var callingMs = item.endTime - item.startTime;
		this.stats.source.callingTime += callingMs;
		s.callingTime += callingMs;

	}

	return item;
};

// get stats to send back to monitoring
Stats.prototype.getStats = function(){

	// work out live stats
	var stats = {
		now: Date.now(),
		serverName: this.config.serverName,
		startupTime: this.startupTime,
		apiLevel: this.config.apiLevel,
		memory: process.memoryUsage(),
		stats: this.stats
	};

	return stats;
};

module.exports = Stats;
