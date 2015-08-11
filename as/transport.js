/*jslint node: true */
'use strict';
var http = require('http');
var https = require('https');
var url = require('url');
// var fs = require('fs');
// var path = require('path');
// var xml2json = require('xml2json');
// var hash = require('./hash');
var utils = require('./utils');
// var html2json = require('./html2json');
var xray = require('x-ray')();

function Transport() {
  this.config = {};
}

Transport.prototype.init = function(c) {
  this.config = c;
};

// response caching
// Transport.prototype.cacheFilename = function(url){
//  var md5 = hash.md5sum(url.toLowerCase());
//  return path.resolve(
//    __dirname, '..',
//    this.config.cacheDir,
//    md5.split('').slice(0,this.config.cacheLevels).join('/'),
//    md5+'.dat'
//  );
// };

// Transport.prototype.checkCache = function(url, cb){
//  var filename = this.cacheFilename(url);
//  fs.stat(filename, function(err, s){
//    if(err) { return cb(err, 0); }
//    cb(null, +s.mtime);
//  });
// };

// Transport.prototype.getCache = function(url, cb){
//  var filename = this.cacheFilename(url);
//  fs.stat(filename, function(err, s){
//    if(err) { return cb(null, 0, null, null); }
//    fs.readFile(filename, function(err, data){
//    if(err || !data) { return cb(null, 0, null, null); }
//      console.log('Reading cache from',path.basename(filename),'for',url);
//      cb(err, +s.mtime, data.slice(0,1).toString(), data.slice(1));
//    });
//  });
// };

// Transport.prototype.setCache = function(url, lastModified, type, data){
//  var mode = 0664;
//  var filename = this.cacheFilename(url);
//  utils.rmkdir(path.dirname(filename), function(err){
//    if(err) { return console.error('Error creating directory for cache',url,err); }
//    // write to a temporary file and then rename on complete
//    var tmpfilename = filename+'.download';
//    // try setting the mode of the file first
//    fs.chmod(tmpfilename, mode, function() {
//      var stream = fs.createWriteStream(tmpfilename, { flags: 'w', encoding: null, mode: mode });
//      stream.on('error', function(err){
//        if(err) { return console.error('Error writing cache data for',url,err); }
//      });
//      stream.on('close', function(){
//        lastModified = lastModified / 1000;
//        fs.utimes(tmpfilename, lastModified, lastModified, function(err){
//          if(err) { return console.error('Error updating cache date for',url,err); }
//          // overwrite old cache entry with new one
//          // try setting the mode of the file first
//          fs.chmod(filename, mode, function() {
//            fs.unlink(filename, function(){
//              fs.rename(tmpfilename, filename, function(err){
//                if(err) { return console.error('Error renaming cache file for',url,err); }
//              });
//            });
//          });
//        });
//      });
//      stream.write(type.slice(0,1), 'ascii');
//      stream.end(data);
//      data = null;
//    });
//  });
// };

// Transport.prototype.doNTLMAuth = function(options, res, cb){
//  var that = this;
//  if(!options.auth || options.auth.type !== 'ntlm') {
//    var err = new Error('Tried to do NTLM auth for non NTLM request');
//    err.kind = 'upstream';
//    err.url = options.uri;
//    err.source = options.source;
//    err.http = res.statusCode;
//    return cb(err);
//  }

//  // proccess the content
//  res.on('data', function (chunk) {
//  });

//  res.once('end', function(){

//    var ntlm = require('ntlm');
//    var KeepAliveAgent = require('keep-alive-agent');

//    // hack for broken regex in ntlm module
//    res.headers['www-authenticate'] = res.headers['www-authenticate'] + ' ';

//    if(!options.auth.initialHeaderSent) {
//      console.log('Fetch', 'NTLM Sending initial header');
//      var parsedUrl = url.parse(options.uri);
//      var hostname = parsedUrl.hostname.split('.').shift();
//      options = Object.copy(options);
//      options.auth = Object.copy(options.auth);
//      options.auth.sendAuthHeader = ntlm.challengeHeader(hostname, options.auth.domain);
//      options.auth.initialHeaderSent = true;
//             options.agent = new KeepAliveAgent({
//        maxSockets: 1,
//        maxFreeSockets: 1,
//        keepAlive: true,
//        keepAliveMsecs: 30000
//             });
//      return that.oneFetch(options, cb);
//    }

//    if(options.auth.initialHeaderSent && !options.auth.responseHeaderSent) {
//      console.log('Fetch', 'NTLM Received challenge header');
//      options = Object.copy(options);
//      options.auth = Object.copy(options.auth);
//          options.auth.sendAuthHeader = ntlm.responseHeader(
//            res,
//            options.uri,
//            options.auth.domain,
//            options.auth.user,
//            options.auth.pass);
//      options.auth.responseHeaderSent = true;
//      console.log('Fetch', 'NTLM Sending response header');
//      return that.oneFetch(options, cb);
//    }

//    var err = new Error('Unexpected NTLM state');
//    err.kind = 'upstream';
//    err.url = options.uri;
//    err.source = options.source;
//    err.http = res.statusCode;
//    return cb(err);
//  });
// };

// fetch a url and return a json structure
Transport.prototype.fetch = function(options, ocb) {
  // set up a callback timeout for this request
  var cb = callbackTimeout(function(err,json,lastModified){
    ocb(err, json, lastModified);
  }, options.timeout);

  this.oneFetch(options, cb, 1);
};

Transport.prototype.oneFetch = function(options, cb, tries) {
  var that = this;

  var code = 0;

  var tidyError = function(err) {
    if (err) {
      err.kind = err.kind || 'upstream';
      err.url = options.uri;
      err.source = options.source;
      err.http = code || 0;
    }
    return err;
  };

  // retry the request after a delay on faliure
  var retry = function() {
    var delay = options.retryDelay || 250;
    delay = Math.ceil((delay * tries) + (Math.random() * delay));
    tries++;
    console.log('RETRY', 'Retrying fetch after ' + delay + 'ms, try ' + tries);
    setTimeout(function() {
      that.oneFetch(options, cb, tries);
    }, delay);
  };

  // function to decode the raw text to to json
  function processRaw(raw, type, lastModified, cb) {
    var json;
    try {
      switch(type.slice(0,1)) {
        case 'x':
          // json = xml2json.toJson(raw, { object: true, coerce: true, trim: true, sanitize: false, reversible: true });
          break;
        case 'h':
          // json = html2json.parse(raw);
          // xray(url, scope, selector)(fn(err,data))

        // x('http://news.ycombinator.com', 'tr.athing', [{}])
        //  (function(err, data) {
        //    if (err) {
        //      console.log('Error: ' + err);
        //    } else {
        //      console.log(data);
        //    }
        //  });

          xray(raw, 'li.shopBrandItem', [{
              name: 'a',
              url: 'a@href',
            }])
            (function(err, data) {
              if (err) {
                console.log('Error: ' + err);
              } else {
                console.log(data);
                json = data;
              }
            });

          break;
        case 'j':
          json = JSON.parse(raw);
          break;
        default:
          json = {text: ''+raw};
      }
    } catch(e) {
      return cb(tidyError(e));
    }

      cb(null, json, lastModified || 0);
  }

  // set up timings and reporting for this request
  // var startTime = Date.now();
  var socketTime = null;
  var responseTime = null;
  // var lastModifiedRequest = 0;

  // var report = function(c) {
  //  var now = Date.now();
  //  that.config.statsManager.reportFetch({
  //    feed: options.feed,
  //    uri: options.uri,
  //    startTime: startTime,
  //    socketTime: socketTime || now,
  //    responseTime: responseTime || socketTime,
  //    endTime: now,
  //    responseCode: c || code || 0,
  //    lastModified: lastModifiedRequest
  //  });
  // };

  try {

    // if(options.method === 'FILE') {
    //  // get local file
    //  var lastModified = 0;
    //  var filename = path.resolve(__dirname, '..', options.uri);
   //     // slice(1) will get the . off the beginning of the extention
    //  var type = options.contentType;
    //  if(!type) {
    //      var type = path.extname(filename).slice(1);
    //    }
   //     // get file info to get last modified time
    //  fs.stat(filename, function(err, stat){
    //    if(err) { return cb(tidyError(err)); }
    //    lastModified = +(stat.mtime);
    //    // read file
    //    fs.readFile(filename, function(err, raw){
    //        if(err) { return cb(tidyError(err)); }
    //      processRaw(raw, type, lastModified, cb);
    //    });
    //  });
    // }


    // else
    if (options.method === 'GET' || options.method === 'POST') {

      // set up http request
      var parsedUrl = url.parse(options.uri);
      // set up options that will be passed to the request
      var protocol = parsedUrl.protocol === 'https:' ? https : http;
      var parsedOptions = {
        method: options.method,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || undefined,
        path: parsedUrl.path,
        headers: options.headers ? utils.objectCopy(options.headers) : {},
        agent: options.agent || protocol.globalAgent
      };
      if (parsedUrl.port) {
        parsedOptions.port = parsedUrl.port;
      }
      // if(options.auth) {
      //  if(options.auth.type === 'basic') {
      //    parsedOptions.auth = options.auth.user+':'+options.auth.pass;
      //  }
      //  if(options.auth.type === 'oauth') {
      //    parsedOptions.headers['Authorization'] = 'Bearer ' + options.auth.bearer;
      //  }
      //  if(options.auth.type === 'ntlm') {
      //    parsedOptions.headers['Authorization'] = options.auth.sendAuthHeader;
      //  }
   //       }

      if (this.config.proxy && parsedUrl.protocol !== 'https:') {
        parsedOptions.headers.Hostname = parsedOptions.hostname + (parsedOptions.port ? ':' + parsedOptions.port : '');
        parsedOptions.hostname = this.config.proxy.host;
        parsedOptions.port = this.config.proxy.port;
        parsedOptions.path = options.uri;
      }

      // check cache to see if we have cached data for this request
      // that.checkCache(options.uri, function(err, ifModifiedSince) {
      //  lastModifiedRequest = ifModifiedSince || 0;

        // var getFromCache;

        // // add if modified since header if required
        // if(ifModifiedSince) {
        //  parsedOptions.headers['If-Modified-Since'] = (new Date(ifModifiedSince)).toUTCString();

        //  // set up function to fetch from cache
        //  getFromCache = function(status){
        //    that.getCache(options.uri, function(err, lastModified, type, raw) {
        //      if(err) {
        //        // report caching error
        //        err.kind = err.kind || 'cache';
        //        // report();
        //        return cb(tidyError(err));
        //      }

        //      // if a content type was specified then always use that
        //      if(options.contentType) {
        //        type = options.contentType;
        //      }

        //      // report and process response
        //      // report(status);
        //      return processRaw(raw, type, lastModified, cb);
        //    });
        //  };
        // }
        // get the remote file
        var r = protocol.request(parsedOptions, function(res) {
          responseTime = Date.now();

          // on http error try again
          if(res.statusCode >= 500 && tries < options.retries) {
            console.warn('Fetch', res.statusCode, 'error on try', tries, 'for', options.uri);
            res.socket.end();

            // report(res.StatusCode);
            return retry();
          }

          // if(res.statusCode === 401 && options.auth) {
          //  var authHeader = res.headers['www-authenticate'];
          //  if(authHeader && ~authHeader.indexOf('NTLM')) {
          //    return that.doNTLMAuth(options, res, cb);
          //  }
          // }

        // if (res.statusCode === 404 && options.fetchDataOn404) {
        //   res.socket.end();

        //   type = options.contentType;
        //   var raw = options.fetchDataOn404;

        //   var lastModified;
        //   if (res.headers['last-modified']) {
        //     lastModified = +utils.toDate(res.headers['last-modified']);
        //   }
        //   if (!lastModified) {
        //     lastModified = Date.now();
        //   }

        //   // save this response to cache
        //   // that.setCache(options.uri, lastModified, type, raw);

        //   // add to fetch stats
        //   // report(404);

        //   return processRaw(raw, type, lastModified, cb);
        // }

          // not modified response received or too many errors and we have a cached version
          // if(res.statusCode === 304 && getFromCache) {
          //  res.socket.end();
          //  return getFromCache(res.statusCode);
          // }

          // on other errors or too many 500 errors
          // if(res.statusCode !== 200) {
          //  res.socket.end();

          //  if(getFromCache) {
          //    console.warn('Fetch', res.statusCode, 'error on try', tries, 'for', options.uri, 'Using cached version.');
          //    return getFromCache(res.statusCode);
          //  }

          //  // report(res.statusCode);

          //  var err = new Error('HTTP Error '+res.statusCode);
          //  return cb(tidyError(err));
          // }


          if(res.statusCode === 200) {
            // extract last modified from headers as epochms
            var lastModified;
            if(res.headers['last-modified']) {
              lastModified = +utils.toDate(res.headers['last-modified']);
            }
            if(!lastModified) {
              lastModified = Date.now();
            }
            // eat the content
            // if size is available then precreate the buffer
            var size = +res.headers['content-length'] || 0;
            var raw = new Buffer(size);
            if(size) {
              var pos = 0;
              res.on('data', function (chunk) {
                chunk.copy(raw, pos);
                pos += chunk.length;
              });
            } else {
              // otherwise just concat the packets
              res.on('data', function (chunk) {
                raw = Buffer.concat([raw, chunk]);
              });
            }
          }

          // proccess the content
          res.once('end', function(){

            if(res.statusCode === 200) { // the statuscode should always be 200 here anyway

              // default to returning the entire response as text
              var type = 'text';
              if(options.contentType) {
                // if a content type was specified then always use that
                type = options.contentType;
              }
              else if(res.headers['content-type']) {
                // otherwise guess the type from the content type header
                if(res.headers['content-type'].match(/xml/i)) {
                  type = 'xml';
                }
                else if(res.headers['content-type'].match(/json/i)) {
                  type = 'json';
                }
                else if(res.headers['content-type'].match(/text\/html/i)) {
                  type = 'html';
                }
              }

              // save this response to cache
              // that.setCache(options.uri, lastModified, type, raw);

              // add to fetch stats
              // report(200);

              return processRaw(raw, type, lastModified, cb);
            }

          });
        });
        r.setTimeout(options.httpTimeout || 60000, function() {
          code = code || 504;
          console.warn('Fetch HTTP connect timeout for ',options.uri);
          r.abort();
        });

        var errorHandler = function(err) {
          // try {
          //   res.socket.end();
          // } catch(e) {}

          err.kind = err.kind || 'upstream';
          err.url = options.uri;
          err.source = options.source;
          err.http = code || 0;

          if(tries < options.retries) {
            console.warn('Fetch socket error on try', tries, 'for', options.uri,':',err);
            // report();
            return retry();
          }

          // if(getFromCache) {
          //  console.warn('Fetch socket error on try', tries, 'for', options.uri,':',err,'Using cached version.');
          //  return getFromCache();
          // }

          // report();

          return cb(tidyError(err));
        };

        r.on('socket', function(socket) {
          // mark off socket timer
          socketTime = Date.now();
          socket.removeAllListeners('error');
          socket.on('error', errorHandler);
        });
        r.on('error', errorHandler);

        r.end();

      // }); // end checkCache
    }


    else {
      var err = new Error('Unknown transport method '+options.method);
      err.kind = err.kind || 'definition';
      cb(tidyError(err));
    }

  } catch(e) {
    e.kind = e.kind || 'fetch';
    console.error('Error firing request', e);
    // report();
    return cb(tidyError(e));
  }
};

module.exports = Transport;

