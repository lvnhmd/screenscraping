var $ = require('cheerio');
var entities = require('entities');


var defaultTags = {
	'title': {
		start: '<h1>',
		end: '</h1>\n'
	},
	'h1': {
		start: '<h1>',
		end: '</h1>\n'
	},
	'h2': {
		start: '<h2>',
		end: '</h2>\n'
	},
	'h3': {
		start: '<h3>',
		end: '</h3>\n'
	},
	'h4': {
		start: '<h4>',
		end: '</h4>\n'
	},
	'br': {
		start: '<br/>\n'
	},
	'a': {
		start: '<a>',
		attr: ['href'],
		end: '</a>'
	},
	'p': {
		start: '<p>',
		end: '</p>\n'
	},
	'div': {
		start: '<p>',
		end: '</p>\n'
	},
	'tr': {
		start: '<p>',
		end: '</p>\n'
	},
	'td': {
		start: '<span>',
		end: '</span>'
	},
	'b': {
		start: '<b>',
		end: '</b>'
	},
	'strong': {
		start: '<b>',
		end: '</b>'
	},
	'i': {
		start: '<i>',
		end: '</i>'
	},
	'em': {
		start: '<i>',
		end: '</i>'
	},
	'u': {
		start: '<u>',
		end: '</u>'
	},
	'li': {
		start: '<li>',
		end: '</li>'
	},
	'ol': {
		start: '<ol>',
		end: '</ol>'
	},
	'ul': {
		start: '<ul>',
		end: '</ul>'
	}
};


function removeHTML(str) {
	if (!str) {
		return;
	}
	str = str.replace(/<[^>]+?>/g, '');
	str = entities.decode(str, 2);
	return str;
}

function decodeSafeEntities(str) {
	if (!str) {
		return;
	}
	str = decodeEntities(str);
	str = encodeUnsafeEntities(str);
	return str;
}

function encodeUnsafeEntities(str) {
	if (!str) {
		return;
	}
	str = str
		.replace(/&/g,'&amp;')
		.replace(/"/g,'&quot;')
		.replace(/</g,'&lt;')
		.replace(/>/g,'&gt;');
	return str;
}

function encodeEntities(str) {
	if (!str) {
		return;
	}
	str = entities.encode(str, 0);
	return str;
}

function decodeEntities(str) {
	if (!str) {
		return;
	}
	str = str
		.replace(/&#x2019;/g,"'")
		.replace(/&nbsp;/g,' ');
	str = entities.decode(str, 2);
	return str;
}

function parse(html) {
	return $.load(html, {
		normalizeWhitespace: true,
		lowerCaseTags: true
	});
}

function stringify(el, options, newParents) {
	if (!el) {
		return '';
	}

	if (typeof el === 'string') {
		el = parse(el);
	}
	if(typeof el === 'function') {
		el = el._root.children;
	}
	if (typeof el.length !== 'number') {
		el = $(el);
	}

	options = options || {};
	var tags = options.tags || defaultTags;
	// create new copy of options so that we don't polute the recursive tree
	options = {
		tags: tags,
		parents: options.parents || []
	};

	// add on new parents so functions can see where we have been
	if (newParents) {
		options.parents = options.parents.concat(!Array.isArray(newParents) ? newParents : [newParents]);
	}
	var result = '';
	for (var i = 0; i < el.length; i++) {
		var child = el[i];

		if (child.type === 'text') {
			result += decodeSafeEntities(child.data);
		} else if (child.type === 'tag') {
			var name = child.name;

			// lookup one level of forwarding
			if (typeof tags[name] === 'string') {
				name = tags[name];
			}

			// fill in full tag details for shortcuts
			if (typeof tags[name] === 'boolean' || name === tags[name]) {
				if (tags[name]) {
					tags[name] = {
						start: '<' + name + '>',
						end: '</' + name + '>'
					};
				} else {
					tags[child.name] = {
						start: '<' + name + '/>'
					};
				}
			}

			// run functions
			if (typeof tags[name] === 'function') {
				// function to recreate the tag and all its children
				result += (tags[name])($(child), options);
			}

			// proccess html tag and its children
			else {
				if (tags[name] && typeof tags[name].start === 'string') {
					// build tag from allowd attribs
					var start = tags[name].start;
					// filter attributes
					if (tags[name].attr) {
						var attr = '';
						for (var j = 0; j < tags[name].attr.length; j++) {
							var attrName = tags[name].attr[j];
							var childAttr = child.attribs[attrName];
							if (childAttr !== undefined) {
								attr +=
									' ' + attrName + '="' +
									decodeSafeEntities(childAttr) +
									'"';
							}
						}
						// insert attribs
						start = start.substr(0, start.length - 1) + attr + start.substr(-1);
					}
					result += start;
				}

				// assemble children
				result += stringify(child.children, options, name);

				// end tag
				if (tags[name] && typeof tags[name].end === 'string') {
					result += tags[name].end;
				}
			}
		}
	}
	return result;
}


module.exports = {
	defaultTags: defaultTags,
	parse: parse,
	stringify: stringify,
	removeHTML: removeHTML,
	decodeSafeEntities: decodeSafeEntities,
	encodeUnsafeEntities: encodeUnsafeEntities,
	decodeEntities: decodeEntities,
	encodeEntities: encodeEntities
};