/*
    Tasks related to compiling, building, livereloading CSS/Stylus.

    css_build_sync -- generates the main concatenated and minified CSS bundle
                      named include.css.
    css_bundles -- builds CSS bundles specified in the config. Prominently used
                   for Fireplace's splash screen stylesheet.
    css_compile -- compiles all the Stylus files found in the CSS path to
                   .styl.css.
    css_compile_sync -- sync version of css_compile so that the CSS build task
                        can wait for all the CSS to be compiled before
                        concatenating.
*/
var fs = require('fs');
var path = require('path');

var autoprefixer = require('../plugins/gulp-autoprefixer');
var concat = require('gulp-concat');
var gulpIf = require('gulp-if');
var liveReload = require('gulp-livereload');
var mergeStream = require('merge-stream');
var minifyCSS = require('gulp-minify-css');
var order = require('gulp-order');
var rename = require('gulp-rename');
var stylus = require('gulp-stylus');
var through2 = require('through2');

var imgurlsCachebust = require('../plugins/imgurls-cachebust');


var BROWSERSLIST_CSS = [
    '> 1%',
    'last 2 versions',
    'Firefox >= 18',
    'Opera 12.1'
];


// Keeps track of already compiled CSS for liveReload.
var compiledCSS = [];


gulp.task('css_build_sync', ['css_bundles',
                             'css_compile_sync'], function(done) {
    var excludes = Object.keys(MKT_CONFIG.cssBundles || []).map(
        function(bundle) {
            // Exclude generated bundles if any specified in the config.
            return bundle;
        }
    );
    // Exclude previously generated builds.
    excludes.push(MKT_PATHS.include_css);
    // Exclude from project config.
    if (MKT_CONFIG.cssExcludes) {
        excludes = excludes.concat(MKT_CONFIG.cssExcludes);
    }
    excludes = excludes.map(function(css) {
        return '!' + MKT_CONFIG.CSS_DEST_PATH + css;
    });

    // Determine which CSS files and which order to concat through index.html.
    var css_files = [];
    var data = fs.readFileSync(path.resolve('src', 'dev.html'));
    data = data.toString();
    var css_pattern = new RegExp('href="/media/css/(.+.css)"', 'g');
    while (match = css_pattern.exec(data)) {
        css_files.push(match[1]);
    }
    css_src = css_files.map(function(css) {
        return MKT_CONFIG.CSS_DEST_PATH + css;
    });

    if (!css_src.length) {
        return done();
    }

    return gulp.src(css_src.concat(excludes))
        .pipe(stylus(MKT_CONFIG.stylusConfig))
        .pipe(autoprefixer({
            browsers: BROWSERSLIST_CSS
        }))
        .pipe(imgurlsCachebust())
        .pipe(gulpIf(!process.env.MKT_NO_MINIFY, minifyCSS()))
        .pipe(order(css_files,
                    {base: MKT_CONFIG.CSS_DEST_PATH}))
        .pipe(concat(MKT_PATHS.include_css))
        .pipe(gulp.dest(MKT_CONFIG.CSS_DEST_PATH));
});


gulp.task('css_bundles', ['css_compile_sync'], function() {
    var streams = [];

    Object.keys(MKT_CONFIG.cssBundles || []).forEach(function(bundle) {
        streams.push(gulp.src(MKT_CONFIG.CSS_DEST_PATH +
                              MKT_CONFIG.cssBundles[bundle])
            .pipe(concat(bundle))
            .pipe(gulpIf(!process.env.NO_MINIFY, minifyCSS()))
            .pipe(gulp.dest(MKT_CONFIG.CSS_DEST_PATH))
        );
    });

    // Yes, cross the streams.
    if (streams.length) {
        return mergeStream.apply(this, streams);
    }
});


gulp.task('css_compile', function() {
    cssCompile();
});


gulp.task('css_compile_sync', function() {
    return cssCompile();
});


function cssCompile() {
    // Also used by gulp-watch for file-by-file CSS compiling.
    return cssCompilePipe(gulp.src(MKT_PATHS.styl));
}


function cssCompilePipe(stream) {
    // Compile .styl files into .styl.css files. Takes about 2s for all files.
    return stream
        .pipe(rename(function(path) {
            console.log('Compiling ' + path.dirname + '/' + path.basename + '.styl');
        }))
        .pipe(stylus().on('error', function(err) {
            console.log('Stylus compile error: ' + err.name);
            console.log(err.message);
        }))
        .pipe(autoprefixer({
            browsers: BROWSERSLIST_CSS
        }))
        .pipe(rename(function(path) {
            path.extname = '.styl.css';
        }))
        .pipe(gulp.dest(MKT_CONFIG.CSS_DEST_PATH));
}


function smartLiveReload(cssStream, liveReloadServer) {
    // Keep track of already-compiled CSS files and only trigger liveReload
    // if a CSS file has already been compiled so it doesn't fire on webserver
    // startup.
    return cssStream
        .pipe(through2.obj(function(chunk, enc, cb) {
            if (compiledCSS.indexOf(chunk.path) === -1) {
                compiledCSS.push(chunk.path);
            } else {
                var cssPath = MKT_CONFIG.CSS_DEST_PATH +
                              chunk.path.split(MKT_CONFIG.CSS_DEST_PATH)[1];
                liveReload.changed(cssPath, liveReloadServer);
            }
            cb();
        }));
}


module.exports = {
    cssCompile: cssCompile,
    cssCompilePipe: cssCompilePipe,
    smartLiveReload: smartLiveReload
};
