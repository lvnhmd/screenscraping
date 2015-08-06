var crypto = require('crypto');

exports.md5sum = function(input) {
	return crypto
		.createHash('md5')
		.update(input,'utf8')
		.digest('hex')
		.toLowerCase();
};

exports.sha1sum = function(input) {
	return crypto
		.createHash('sha1')
		.update(input,'utf8')
		.digest('hex')
		.toLowerCase();
};
