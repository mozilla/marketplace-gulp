/*
    Takes a stream of Vinyl files (map files) and concatenates the JS files
    while consolidating the source maps, using the mapcat module.

    The first argument is the path to output the resulting src map.
    The first argument is the path to output the resulting JS file.
*/
var mapcat = require('mapcat');
var through = require('through2');


module.exports = function(outputMapPath, outputJsPath, opt) {
    opt = opt || {};

    var mapPaths = [];

    function appendMap(file) {
        if (file.isNull()) {
            return;
        }
        mapPaths.push(file.path);
    }

    function endStream() {
        mapCat(mapPaths, outputMapPath, outputJsPath);
        this.emit('end');
    }

    return through(appendMap, endStream);
};
