module.exports = {
	port: 8080,
	cacheDir: 'cache',
	// source configs
	sourceTypes: {
		'static': {
			method: 'FILE',
			basePath: 'sources/static/',
			feed: 'static'
		},
		'dynamic': {
			method: 'GET',
			basePath: 'http://',
			feed: 'dynamic'
		}
	}
};

