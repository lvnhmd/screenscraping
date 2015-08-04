var Source = require('../as/source');

module.exports = [{
	// provide polling data for the app
    pattern: 'live',
    publish: true,
    handler: function(name, m){
		return new Source(name,{
			type: 'static',
			path: 'live.json',
			// depends: ['ranking','mc/current'],
			ttl: '15m'.inMS,
			returnStaleWhenExpired: true,
			returnStaleOnFail: true,
			perm: true,
			process: function() {
				var json = this.getResult();

				return json;
			}
		});
	}
}];