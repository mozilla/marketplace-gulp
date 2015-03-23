var fs = require('fs');

var del = require('del');
var gulp = require('gulp');
var insert = require('gulp-insert');
var requireDir = require('require-dir');
var replace = require('gulp-replace');

var paths = require('./paths');


// Include tasks from other files, which were split out for organization.
global.gulp = gulp;
global.MKT_PATHS = paths;
global.MKT_PORT = parseInt(process.env.MKT_PORT || MKT_CONFIG.PORT || 8675, 10);
global.MKT_LIVERELOAD_PORT = process.env.MKT_LIVERELOAD_PORT || MKT_PORT + 1000;
requireDir('./tasks');
var jsTasks = require('./tasks/js');


// Switch API settings.
if (process.env.API) {
    var api = MKT_CONFIG.serverConfig[process.env.API];

    if (!api) {
        console.log('Invalid argument for API. Possible options: ');
        console.log(Object.keys(MKT_CONFIG.serverConfig));
        process.exit(1);
    }

    gulp.src(MKT_CONFIG.JS_DEST_PATH + 'settings_local.js')
        .pipe(replace(/api_url: .*/g, "api_url: '" + api.api_url + "',"))
        .pipe(replace(/media_url: .*/g, "media_url: '" + api.media_url + "',"))
        .pipe(replace(/manifest_url: .*/g, "manifest_url: '" + api.manifest_url + "',"))
        .pipe(gulp.dest(MKT_CONFIG.JS_DEST_PATH));

    console.log('settings_local.js has been updated to use the specified API:');
    console.log('     api_url: ' + api.api_url);
    console.log('   media_url: ' + api.media_url);
    console.log('manifest_url: ' + api.manifest_url);
}


gulp.task('bower_copy', function() {
    // Copy files from Bower into project.
    Object.keys(MKT_CONFIG.bowerConfig).forEach(function(source) {
        var dest = MKT_CONFIG.bowerConfig[source];
        gulp.src(paths.bower + source)
            .pipe(gulp.dest(dest));
    });
});


gulp.task('require_config', function() {
    gulp.src(paths.require)
        .pipe(insert.append(MKT_CONFIG.inlineRequireConfig))
        .pipe(gulp.dest(MKT_CONFIG.LIB_DEST_PATH));
});


gulp.task('clean', function() {
    del([
        MKT_CONFIG.CSS_DEST_PATH + 'splash.css',
        MKT_CONFIG.CSS_DEST_PATH + paths.include_css,
        MKT_CONFIG.JS_DEST_PATH + paths.include_js,
        MKT_CONFIG.JS_DEST_PATH + paths.include_js + '.map',
        paths.styl_compiled,
        'package/archives/*.zip',
        'package/.tmp',
        'src/index.html',
        'src/locales',
        'src/media/locales',
        'src/media/build_id.txt',
        'src/media/imgurls.txt',
        'src/templates.js'
    ]);
});


gulp.task('default', ['watch', 'serve']);


gulp.task('update', ['settings_local_js_init', 'bower_copy',
                     'index_html_build', 'require_config',
                     'karma_conf_generate', 'karma_test_main_generate']);


module.exports = {
    jsBuild: jsTasks.jsBuild,
    paths: MKT_PATHS
};
