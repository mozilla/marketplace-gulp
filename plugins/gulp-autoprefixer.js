/*
    Adapted from gulp-autoprefixer.
*/
'use strict';
var autoprefixer = require('autoprefixer-core');
var through = require('through2');


module.exports = function (opts) {
	opts = opts || {};

    function transform(file) {
        return autoprefixer(opts).process(file.contents.toString()).css;
    }

	return through.obj(function(file, enc, cb) {
        file.contents = new Buffer(transform(file));
        this.push(file);
		return cb();
	});
};
