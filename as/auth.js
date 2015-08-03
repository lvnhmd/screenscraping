var OAuth2 = require('oauth').OAuth2;


var Auth = function() {
};

Auth.prototype.init = function(config) {
    for(var typeName in config.sourceTypes) {
        var type = config.sourceTypes[typeName];
        if(type.auth && type.auth.type === 'oauth') {
            this.initOAuth(type);
        }
    }
};

Auth.prototype.initOAuth = function(type) {
    try{
        console.log('Generating OAuth bearer token for',type.feed);
        var oauth2 = new OAuth2(
            type.auth.key,
            type.auth.secret,
            type.auth.endpoint,
            null,
            type.auth.tokenPath,
            null);
        oauth2.getOAuthAccessToken(
            '',
            {'grant_type':'client_credentials'},
            function (err, access_token, refresh_token, results){
                if(err) {
                    return console.error(err);
                }
                console.log('Generated bearer token for',type.feed,': ',access_token);
                type.auth.bearer = access_token;
            });

    } catch(e){
        console.error('OAuth init error',e);
    }
};

module.exports = Auth;
