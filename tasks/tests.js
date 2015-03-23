/*
    Tasks to facilitate testing.

    karma_config_generate -- generates Karma config.
    karma_test_main_generate -- generates unit test bootstrap script.
*/
var fs = require('fs');

var gulpFile = require('gulp-file');
var replace = require('gulp-replace');


gulp.task('karma_conf_generate', function() {
    var cfg = fs.readFileSync(require.resolve('../templates/karma.conf.js'));
    console.log(cfg);
    gulpFile('karma.conf.js', cfg, {src: true})
        .pipe(gulp.dest('./'));
});


gulp.task('karma_test_main_generate', function() {
    // Generate Karma unit test bootstrap script.
    var testJs = fs.readFileSync(require.resolve('../templates/test-main.js'));
    gulpFile('test-main.js', testJs, {src: true})
        .pipe(replace(/{{ CONFIG_PATHS }}/g,
                      JSON.stringify(MKT_CONFIG.requireConfig.paths)))
        .pipe(replace(/{{ CONFIG_SHIM }}/g,
                      JSON.stringify(MKT_CONFIG.requireConfig.shim)))
        .pipe(gulp.dest('./'));
});
