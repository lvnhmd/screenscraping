var Source = require('../as/source');

module.exports = [{
    pattern: 'live',
    publish: true,
    handler: function(name, m) {
        return new Source(name, {
            type: 'static',
            path: 'live.json',
            ttl: '15m'.inMS,
            returnStaleWhenExpired: true,
            returnStaleOnFail: true,
            perm: true,
            process: function() {
                return this.getResult();
            }
        });
    }
}];