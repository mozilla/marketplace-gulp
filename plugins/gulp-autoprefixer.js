/*
    Adapted from gulp-autoprefixer since its sourcemap support was breaking
    things.
*/
'use strict';
var autoprefixer = require('autoprefixer-core');
var gutil = require('gulp-util');
var through = require('through2');

module.exports = function (opts) {
	opts = opts || {};

	return through.obj(function (file, enc, cb) {
		if (file.isNull()) {
			cb(null, file);
			return;
		}
		if (file.isStream()) {
			cb(new gutil.PluginError('gulp-autoprefixer',
                                     'Streaming not supported'));
			return;
		}

		var res;

		try {
			res = autoprefixer(opts).process(file.contents.toString());
			file.contents = new Buffer(res.css);
			this.push(file);
		} catch (err) {
			this.emit('error', new gutil.PluginError('gulp-autoprefixer', err,
                      {fileName: file.path}));
		}

		cb();
	});
};
