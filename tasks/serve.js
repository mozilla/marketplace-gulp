/*
    Tasks related to the local development server.

    serve -- group of tasks for the server. Compiles CSS and templates first.
    watch -- watches files for changes to recompile and such.
    webserver -- starts the webserver on localhost. The port will be specified
                 in the config or as an environment variable. It also handles
                 rewriting paths to bower_components. It serves src/index.html.
*/
var liveReload = require('gulp-livereload');
var rewriteModule = require('http-rewrite-middleware');
var watch = require('gulp-watch');
var webserver = require('gulp-webserver');

var cssCompilePipe = require('./css').cssCompilePipe;
var smartLiveReload = require('./css').smartLiveReload;


gulp.task('serve', ['webserver', 'css_compile', 'templates_build']);


gulp.task('watch', function() {
    // Watch and recompile on change.
    var liveReloadServer = liveReload.listen(MKT_LIVERELOAD_PORT);

    gulp.watch(MKT_PATHS.html, ['templates_build']);

    // CSS compilation uses gulp-watch to only compile modified files.
    gulp.src(MKT_PATHS.styl)
        .pipe(watch(MKT_PATHS.styl, function(files) {
            return smartLiveReload(cssCompilePipe(files), liveReloadServer);
        }));

    // Recompile all Stylus files if a lib file was modified.
    var showLibMsg = false;
    setTimeout(function() {
        showLibMsg = true;
    }, 2000);
    gulp.src(MKT_PATHS.styl_lib)
        .pipe(watch(MKT_PATHS.styl_lib, function(files) {
            if (showLibMsg) {
                console.log('Lib file changed. Recompiling all CSS.');
            }
            return cssCompilePipe(gulp.src(MKT_PATHS.styl));
        }));

    gulp.watch(MKT_PATHS.index_html, ['index_html_build']);
});


gulp.task('webserver', ['index_html_build', 'templates_build'], function() {
    gulp.src(['src', 'bower_components'])
        .pipe(webserver({
            host: '0.0.0.0',
            fallback: 'index.html',
            middleware: rewriteModule.getMiddleware([
                {from: '^/media/js/lib/core/(.*)$',
                 to: '/marketplace-core-modules/core/$1'},
            ].concat(MKT_CONFIG.rewriteMiddleware || [])),
            port: MKT_PORT
        }));
});
