"use strict";
require('colors').setTheme('../themes/generic-logging.js');
// load util support library first so functions can be used in config
// require('./utils').applyToPrimatives();

//Run as: NODE_ENV=production node index.js

function AS(config, definitions) {
	console.log('as:index.js definition begin'.help);
	//load config
	// config.environment = process.env.NODE_ENV || config.environment || 'production';

	// overlay environment over config
	// function applyOverlay(dest,src) {
	// 	if(!src) { return; }
	// 	for(var i in src) {
	// 		if(dest[i] && typeof dest[i] === 'object' && src[i] && typeof src[i] === 'object' && dest[i].splice !== Array.prototype.splice) {
	// 			applyOverlay(dest[i],src[i]);
	// 		} else {
	// 			dest[i] = src[i];
	// 		}
	// 	}
	// }
	// applyOverlay(config,config[config.environment]);

	// apply defaults
	// config.serverName = process.env.NODE_NAME || process.env.HOSTNAME || 'UNKNOWN';
	// if(config.serverName === 'UNKNOWN') {
	// 	try {
	// 		// read hostname from /etc/hostname file if still unknown
	// 		config.serverName = require('fs').readFileSync('/etc/hostname','utf8')
	// 			.replace(/[\n\r\0]+/g,'')
	// 			.replace(/[^a-zA-Z0-9]/g,'-');
	// 	}catch(e) {}
	// }

	// config.apiLevel = config.apiLevel || '0.0.0';
	// config.port = +process.env.NODE_PORT || +config.port || 80;
	// config.statsPort = +process.env.NODE_STATSPORT || +config.statsPort || (+config.port + 1);

	// redirect logs to files as specified in the config
	// require('./log').init(config);

	// initialise auth methods
	// var Auth = require('./auth');
	// config.authManager = new Auth();
	// config.authManager.init(config);

	// load and configure other modules
	// var Stats = require('./stats');
	// config.statsManager = new Stats();
	// config.statsManager.init(config);

	// load transport
	var Transport = require('./transport');
	config.transportManager = new Transport();
	config.transportManager.init(config);

	// load sources
	var SourceManager = require('./sourcemanager');
	config.sourceManager = new SourceManager();
	config.sourceManager.init(config, definitions);


	// init api server
	var APIServer = require('./apiserver');
	config.apiServer = new APIServer(config, function(){
		// if(process.getuid() === 0 && config.webUser) {
		// 	console.log("Dropping privs");
		// 	process.setgroups([config.webGroup || config.webUser]);
		// 	process.setgid(config.webGroup || config.webUser);
		// 	process.setuid(config.webUser);
		// }
	});


	// precache some sources specified in the config
	// if(config.precache) {
	// 	for(var i=0; i<config.precache.length; i++){
	// 		config.sourceManager.precache(config.precache[i]);
	// 	}
	// }


	// add uncaught exception handler
	// process.on('uncaughtException', function(e){
	// 	e.kind = e.kind || 'uncaught';
	// 	console.error('Uncaught Exception, shutting down...');
	// 	console.error('Uncaught Exception:', e);
	// 	try{
	// 		// try server shutdown
	// 		config.apiServer.shutdown(function(){
	// 			// when done or on timeout exit the process
	// 			console.error('Server terminating!');
	// 			console.error('Uncaught Exception:', e);
	// 			console.original.error('Uncaught Exception:', e);
	// 			setTimeout(function(){
	// 				process.exit(-1);
	// 			},2000);
	// 		}, 20000);
	// 	} catch(se) {
	// 		se.kind = se.kind || 'uncaught';
	// 		console.error('Server terminating!');
	// 		console.error('Uncaught Exception:', e);
	// 		console.original.error('Uncaught Exception:', e);
	// 		console.error('Shutdown error:', se);
	// 		console.original.error('Shutdown error:', se);
	// 		setTimeout(function(){
	// 			process.exit(-1);
	// 		},2000);
	// 	}
	// });
	console.log('as:index.js definition end'.help);

}

module.exports = AS;
