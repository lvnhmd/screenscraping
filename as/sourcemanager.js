"use strict";
var utils = require('./utils');

var reIsRegExpString = new RegExp('[\\[\\]\\(\\)\\*\\+]');

// source manager singleton
function SourceManager() {
	this.patternByRegexp = [];
	this.patternByName = {};
	this.config = {};
	this.sources = {};
	this.precacheQueue = [];
}

// configure source manager
SourceManager.prototype.init = function(config, definitions){
	console.log(JSON.stringify(definitions).blue);
  this.config = config;
	this.configured = true;
        // pre-build the regexp for each pattern
	for(var i = 0; i < definitions.length; i++) {
		for(var j=0; j < definitions[i].length; j++){
			var definition = definitions[i][j];

			if(reIsRegExpString.exec(definition.pattern)) {
				definition.regexp = new RegExp('^'+definition.pattern+'$');

				this.patternByRegexp.push(definition);
			} else {

				this.patternByName[definition.pattern] = definition;
			}
                        if(definition.handler.publish) {
				definition.publish = true;
			}

		}
	}
  console.log(JSON.stringify(definitions).green);
  console.log(JSON.stringify(this.patternByRegexp).blue);
  console.log(JSON.stringify(this.patternByName).green);
	// configure any existing sources
	for(var name in this.sources) {
		this.sources[name].init(config);
	}

	// clean up every 5 mins
	if(this.cleanTimer) {
		clearInterval(this.cleanTimer);
	}
	this.cleanTimer = setInterval(this.clean.bind(this), this.config.cleanInterval || 300000);

};

// generate a map of sources to show as a graphviz map
SourceManager.prototype.generateSourceMap = function(pattern, maxDepth) {

    var allSources = this.sources;
    var sources = allSources;

    // fetch required sources
	if(pattern) {
		sources = {};

		// get all children of this pattern
		var getChildren = function(name, currentDepth) {
			var toSource = allSources[name];
			sources[name] = toSource;
			currentDepth++;
			if(maxDepth && currentDepth > maxDepth) {
				return;
			}
			for(var j in toSource.depends) {
				var fromName = toSource.depends[j];
				getChildren(fromName, currentDepth);
			}
		};

		for(var name in allSources) {
			if(pattern === allSources[name].pattern) {
				getChildren(name, 0);
			}
		}
	}

	// convert to nodes and edges
	var nodes = {};
	var edges = {};

	for(var name in sources) {
		var toSource = sources[name];
		var toPattern = toSource.pattern;
		nodes[toPattern] = nodes[toPattern] || {
			c:0,
			p:false,
			t:toSource.definition.type,
			u:toSource.definition.path
		};
		nodes[toPattern].c++;
		nodes[toPattern].p = !!toSource.publish;
		for(var j in sources[name].depends) {
			var fromName = sources[name].depends[j];
			var fromSource = sources[ fromName ];
			if(fromSource) {
				var formPattern = fromSource.pattern;
				edges[formPattern+'->'+toPattern] = {
					from: formPattern,
					to: toPattern
				};
			}
		}
	}

	// convert to gv object
	var obj = {
		nodes: [],
		edges: []
	};
	for(var i in nodes) {
		var label = i + ' (' + nodes[i].c + ')';
		if(nodes[i].t && nodes[i].u) {
			var url = nodes[i].u;
			url = url
				.replace(/\/[A-Z]{3}/g,'/{X}')
				.replace(/\/[0-9]+/g,'/{N}')
				.replace(/\=[0-9]+/g,'={N}')
				.replace(/^matches\/[a-z0-9]+\//,'matches/{T}/')
				.replace(/^standings\/[a-z0-9]+\//,'standings/{T}/')
				.replace(/^statistics\/[a-z0-9]+\//,'statistics/{T}/');
			label += '\n'+nodes[i].t+': '+url;
		}
		obj.nodes.push({
			name: i,
			label: label,
			link: '/sources/'+encodeURIComponent(i) + (maxDepth ? '/'+maxDepth : ''),
			color: nodes[i].p ? 'red' : 'grey'
		});
	}
	for(var i in edges) {
		obj.edges.push(edges[i]);
	}
	return obj;
};

// return active sources to help trace slowness of a request
SourceManager.prototype.getActiveSources = function(){
	var json = [];
	for(var i in this.sources) {
		var s = this.sources[i];
		if(s.active) {
			json.push({
				name: s.name,
				pattern: s.pattern,
				callbacks: s.callbacks.length,
				paths: s.paths,
				expires: s.expires,
				expiresSource: s.expiresSource,
				depends: s.depends
			});
		}
	}
	return json;
};

// return active sources to help trace slowness of a request
SourceManager.prototype.getTransportSources = function(){
	var json = [];
	var now = Date.now();
	for(var name in this.sources) {
		var s = this.sources[name];
		if(s.active && s.results[name] && !s.results[name].complete) {
			json.push({
				name: s.name,
				pattern: s.pattern,
				type: s.definition.type,
				path: s.definition.path,
				time: (now - s.fetchStartTimestamp).toTime(),
				callbacks: s.callbacks.length,
				paths: s.paths,
			});
		}
	}
	return json;
};
// return active sources to help trace slowness of a request
SourceManager.prototype.getSourceTree = function(name, loop){
	loop = loop || {};
	var json = {};
	var s = this.sources[name];
	if(s) {
		loop[ name ] = true;
		var tree = [];
		for(var i=0; i<s.depends.length; i++) {
			if(loop[ s.depends[i] ]) {
				tree.push(s.depends[i]);
			} else {
				tree.push(this.getSourceTree(s.depends[i], loop));
			}
		}
		json = {
			name: s.name,
			pattern: s.pattern,
			expires: s.expires,
			expiresSource: s.expiresSource,
			expiresText: utils.dateToW3C(utils.toDate(s.expires||0)),
			ttl: s.expires ? s.expires - Date.now() : null,
			tree: tree
		};
	}
	return json;
};

// precache a source in the background
SourceManager.prototype.precache = function(name) {
	var that = this;
	this.precacheQueue.push(name);
	if(this.precacheQueue.length !== 1) { return; }
	var delay = Math.round(Math.random() * 500);
	function precacheNext(){
		var name = that.precacheQueue.shift();
		if(name && !that.sources[name]) {
			console.log('Pre-caching',name);
			that.get(name, [['precache']], function(err){
				if(err) {
					console.error('Error pre-caching '+name+':',err);
				}
				setTimeout(precacheNext, delay);
			});
		}
	}
	setTimeout(precacheNext,delay);
};

// let a source know that it was used in a result so it doesn't get destroyed too early
SourceManager.prototype.poke = function(name) {
	var source = this.sources[name];
	if(source) {
		source.poke();
	}
};

// get a source by name
// the path is an array of the route taken to get here
SourceManager.prototype.get = function(name, paths, callback, checkPublish) {
	name = name.toLowerCase();

	// check if we are in a get path loop
	for(var i=0; i<paths.length; i++) {
		if(~paths[i].indexOf(name)) {
			var err = new Error('Source loop: '+paths[i].join(' => ')+' => '+name);
			err.kind = 'definition';
			err.source = name;
			return callback(err);
		}
	}

	// look for existing source in cache
	var source = this.sources[name];

	if(!source) {
		// if no existing source try to find a source creation function by name
		var match;
		var definition = this.patternByName[name];
		if(definition && !definition.regexp) {
			// function found by name
			match = [ name ];
		} else {
			definition = undefined;

			// function not found by name, look for a matching regexp
			for(var i=0; i<this.patternByRegexp.length; i++) {
				var regexp = this.patternByRegexp[i].regexp;
				if(regexp) {
					match = regexp.exec(name);
					if(match) {
						// match found
						definition = this.patternByRegexp[i];
						break;
					}
				}
			}
		}

		// if source creation functon found try to create this source
		if(definition) {
			// check if this pattern can be published
			if(checkPublish && !definition.publish) {
				var err = new Error('API not published');
				err.kind = 'client';
				err.http = 403;
				err.source = name;
				return callback(err);
			}

			// run the source creation function
			try {
				source = definition.handler.call(this, name, match);
			} catch(err) {
				source = null;
				err.kind = err.kind || 'definition';
				err.source = err.source || name;
				console.error('Error running pattern function '+definition.pattern, err);
			}
		}

		// if a source was successfully created then add to source manager
		if(source) {
			source.pattern = definition.pattern;
			source.publish = definition.publish;
			console.log('New '+(source.publish?'published ':'')+'source created for '+source.name);

			// add to this source manager
			this.sources[source.name] = source;
		}
	}

	// if still no source then error out
	if(!source) {
		var err = new Error('API not found');
		err.kind = 'client';
		err.http = 404;
		err.source = name;
		return callback(err);
	}

	// check if this source is published
	if(checkPublish && !source.publish) {
		var err = new Error('API not published');
		err.kind = 'client';
		err.http = 403;
		err.source = name;
		return callback(err);
	}

	// init and get from this source
	source.init(this.config, function(){
		source.get(paths, callback);
	});

};

// clean out old sources, or refresh them if they are perm
SourceManager.prototype.clean = function() {
	console.log('Cleaning sources');
	var now = Date.now();
	var oneHourAgo = now - '30m'.inMS;
	var tenMinsAgo = now - '10m'.inMS;
	var inTenSeconds = now + '10s'.inMS;
	for(var name in this.sources) {
		var source = this.sources[name];
		if(source.active) { continue; }
		if(source.fetchNextTimer) { continue; }
		if(source.definition.perm === false) { continue; }
		// within 10 seconds of expiry date and last accessed less than one hour ago
		if(	(source.expires < inTenSeconds) && (source.lastAccessed > oneHourAgo) ) {
//				source.schedule('refresh');
		}
	}
	for(var name in this.sources) {
		var source = this.sources[name];
		if(source.active) { continue; }
		if(source.fetchNextTimer) { continue; }
		if(source.definition.perm) { continue; }
		if(	(source.expires < tenMinsAgo) && (source.lastAccessed < oneHourAgo) ) {
			source.destroy();
			delete this.sources[name];
			console.log('Source destroyed:',name);
		}
	}
};

// export a SourceManager singleton
module.exports = SourceManager;

