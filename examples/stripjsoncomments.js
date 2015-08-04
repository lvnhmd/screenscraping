var fs = require('fs');
require('colors');
var stripJsonComments = require('strip-json-comments');
var prettyjson = require('prettyjson');

// var prettyjsonoptions = {
//   noColor: false
// };

var str = fs.readFileSync('../persist/selfridges_comments.json','utf8');

// console.log(prettyjson.render(JSON.parse(str)));
// will throw Unexpected token / because there are commments in the json file 

console.log(prettyjson.render(JSON.parse(stripJsonComments(str))));
