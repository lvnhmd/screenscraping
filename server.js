require('colors').setTheme('../themes/generic-logging.js');

console.log('server.js begin'.info);

var asServer = new require('./as/')(
    require('./config'), [
        require('./sources/live'),
        require('./sources/selfridges')
    ]
);

console.log('server.js end'.info);