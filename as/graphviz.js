
function GraphViz(obj, title) {
	this.dot = '';
	if(obj) {
		this.fromJSON(obj, title);
	}
}

GraphViz.prototype.fromNodesAndEdges = function(nodes, edges, title) {
	var lookup = {};
	var serial = 0;

	var result =
		'digraph NodesAndEdges {\n'+
		'size="30,30";\n'+
		'overlap=false;\n'+
		'splines=true;\n'+
		'pad=1.0;\n'+
		'ranksep="1.5 equally";\n'+
//		'rankdir=LR;\n'+
		'node [\n'+
			'shape=box\n'+
		'];\n'+
		'edge [\n'+
 			'penwidth=2,\n'+
 			'weight=1.0\n'+
		'];\n'+
		'';

	if(title) {
		result +=
			'label="'+title+'";\n'+
			'labelloc=t;\n'+
			'labelfontsize=50;\n';
	}

	for(var i in nodes) {
		serial++;
		var name = 'N_'+serial;
		lookup[ nodes[i].name || nodes[i].label ] = name;
		var attr = [ 'label='+JSON.stringify(nodes[i].label)];
		if(nodes[i].link) {
			attr.push('URL='+JSON.stringify(nodes[i].link));
		}
		if(nodes[i].color) {
			attr.push('color="'+nodes[i].color+'"');
		}
		result += name+' ['+attr.join(' ')+'];\n';
	}
	for(var i in edges) {
		var from = lookup[ edges[i].from ];
		var to = lookup[ edges[i].to ];
		result += from+' -> '+to+';\n';
	}

	result += '}\n';

	this.dot = result;
};

GraphViz.prototype.fromObject = function(obj, title) {
	var serial = 0;
	function recurse(obj, parent) {
		serial++;
		var name = 'N_'+serial;
		var result = '';
		result += name+' [label="'+obj.name+'"];\n';
		if(parent) {
			result += parent+' -> '+name+';\n';
		}
		if(obj.children) {
			for(var i in obj.children) {
				result += recurse(obj.children[i], name);
			}
		}
		return result;
	}

	var result =
		'digraph Object {\n'+
		'size="30,30";\n'+
		'overlap=false;\n'+
		'splines=true;\n'+
		'rankdir=LR;\n'+
		'node [\n'+
			'shape=box\n'+
		'];\n'+
		'edge [\n'+
 			'penwidth=2,\n'+
 			'weight=1.0\n'+
		'];\n'+
		'';

	if(title) {
		result +=
			'label="'+title+'";\n'+
			'labelloc=t;\n'+
			'labelfontsize=50;\n';
	}

	result += recurse(obj);

	result += '}\n';

	this.dot = result;
};

GraphViz.prototype.fromJSON = function(obj, title) {
	var serial = 0;
	function html(s,w) {
		if(w) {
			var wrapped = '';
			while(s.length > w) {
				var end = s.lastIndexOf(' ',w);
				if(end < (w/2)) { end = w; }
				wrapped += s.substr(0,end) + '\n';
				s = s.substr(end);
			}
			wrapped += s;
			s = wrapped;
		}
		s = s
			.replace(/\&nbsp;/g,' ')
			.replace(/\&[a-z]+;/g,'?')
			.replace(/\&/g,'&amp;')
			.replace(/"/g,'&quot;')
			.replace(/>/g,'&gt;')
			.replace(/</g,'&lt;');

		if(w) {
			s = s
			.replace(/\n/g,'<BR ALIGN="LEFT"/>\n')+
			'<BR ALIGN="LEFT"/>';
		}
		return s;
	}
	var objectRefs = [];
	var objectNames = [];

	function recurse(obj, title, parent) {
		var result = '';
		var subresult = '';
		var index = 0;

		if(parent){
			var exists = objectRefs.indexOf(obj);
			if(~exists) {
				return parent+' -> '+objectNames[exists]+':head;\n';
			}
		}

		serial++;
		var name = 'N_'+serial;

		objectRefs.push(obj);
		objectNames.push(name);

		if(typeof obj !== 'object' || !obj) { var tmp=obj; obj={}; obj[typeof tmp] = tmp; }

		var nodes = [];

		if(title) {
			nodes.push('<TR><TD COLSPAN="2" PORT="head"><b>'+html(title)+'</b></TD></TR>');
		}

		for(var i in obj) {
			if(i[0] === '_') { continue; }
			var value = obj[i];
			var port = '';
			var color = '#444444';
			var href = '';
			if(typeof value === 'string') {
				if(value.match(/^http/)) { href = html(value); }
				value = html('"'+value.substr(0,140)+(value.length>140?'...':'')+'"', 35);
				color = '#004400';
			}
			else if(typeof value === 'number') {
				value = ''+value;
				color = '#440000';
			}
			else if(typeof value === 'boolean') {
				value = value?'true':'false';
				color = '#000044';
			}
			else if(typeof value === 'function') {
				value = 'function()';
			}
			else if(value === null) {
				value = 'null';
			}
			else if(value === undefined) {
				value = 'undefined';
			}
			else {
				port = 'f'+index;
				if(Array.isArray(value)) {
					if(value.length) {
						var best = null;
						for(var j in value) {
							// get biggest object in array
							if(value[j] && typeof value[j] === 'object' && (!best || Object.keys(value[j]).length > Object.keys(best).length)) {
								best = value[j];
							}
						}
						if(best){
							subresult += recurse(best, i+'[]', name+':'+port);
						} else {
							subresult += recurse(value, i, name+':'+port);
						}
					}
					value = '[Array('+value.length+')]';
					color = '#444400';
				}
				else if(Object.keys(value).length > 20) {
					var best = null;
					for(var j in value) {
						// get biggest object in array
						if(value[j] && typeof value[j] === 'object' && (!value[best] || Object.keys(value[j]).length > Object.keys(value[best]).length)) {
							best = j;
						}
					}
					subresult += recurse(value[best], i+'['+best+']', name+':'+port);
					value = '[Object]';
					color = '#440044';
				} else {
					subresult += recurse(value, i, name+':'+port);
					value = '[Object]';
					color = '#440044';
				}
				index++;
			}
			nodes.push('<TR><TD VALIGN="TOP" ALIGN="LEFT">'+html(i)+'</TD><TD VALIGN="TOP" ALIGN="LEFT"'+(port?' PORT="'+port+'"':'')+(href?' HREF="'+href+'"':'')+'><FONT COLOR="'+color+'">'+value+'</FONT></TD></TR>');
		}
		if(nodes.length) {
			result += name+' [title="'+title+'" label=<<FONT FACE="sans-serif"><TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="2">\n'+nodes.join('\n')+'\n</TABLE></FONT>>];\n';
			if(parent){
				result += parent+' -> '+name+':head;\n';
			}
		}

		result += subresult;
		return result;
	}

	var result =
		'digraph JSON {\n'+
		'size="30,30";\n'+
		'overlap=false;\n'+
		'splines=true;\n'+
		'rankdir=LR;\n'+
		'ranksep=1.0;\n'+
		'nodesep=0.5;\n'+
		'node [\n'+
			'shape=plaintext\n'+
		'];\n'+
		'edge [\n'+
 		'penwidth=2,\n'+
 		'weight=1.0\n'+
		'];\n'+
		'';

	if(title) {
		result +=
			'label="'+title+'";\n'+
			'labelloc=t;\n'+
			'labelfontsize=50;\n';
	}

	result += recurse(obj);

	result += '}\n';

	this.dot = result;
};

var spawn = require('child_process').spawn;
var fs = require('fs');

GraphViz.prototype.asImage = function(ranked, type, callback) {
	var that = this;

	if(typeof type === 'function') {
		callback = type;
		type = null;
	}
	if(!type) { type = 'svg'; }

	var tempfile = '/tmp/'+Math.floor(Math.random()*100000)+'.dot';
	fs.writeFile(tempfile, this.dot, function(){

		var dot = spawn(ranked ? 'dot' : 'neato', [tempfile,'-T'+type]);

		var buffer = new Buffer(0);
		dot.stdout.on('data', function (data) {
			buffer = Buffer.concat([buffer, data]);
		});

		var err = '';
		dot.stderr.on('data', function (data) {
			err += data;
		});

		dot.on('close', function (code) {
			fs.unlink(tempfile);
			if(!err) { err = null; }
			return callback(err, buffer);
		});

	});
};

GraphViz.prototype.asSVG = function(callback) {
	this.asImage(true, 'svg', callback);
};
GraphViz.prototype.asNeatoSVG = function(callback) {
	this.asImage(false, 'svg', callback);
};

GraphViz.prototype.asSVGZ = function(callback) {
	this.asImage(true, 'svgz', callback);
};
GraphViz.prototype.asNeatoSVGZ = function(callback) {
	this.asImage(false, 'svgz', callback);
};

GraphViz.prototype.asPS = function(callback) {
	this.asImage(true, 'ps2', callback);
};
GraphViz.prototype.asNeatoPS = function(callback) {
	this.asImage(false, 'ps2', callback);
};

GraphViz.prototype.asPNG = function(callback) {
	this.asImage(true, 'png', callback);
};
GraphViz.prototype.asNeatoPNG = function(callback) {
	this.asImage(false, 'png', callback);
};

module.exports = GraphViz;

