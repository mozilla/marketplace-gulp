var fs = require('fs');
var path = require('path');

var concat = require('gulp-concat');
var del = require('del');
var eventStream = require('event-stream');
var extend = require('node.extend');
var gulp = require('gulp');
var gulpFile = require('gulp-file');
var gulpIf = require('gulp-if');
var gulpUtil = require('gulp-util');
var insert = require('gulp-insert');
var liveReload = require('gulp-livereload');
var jshint = require('gulp-jshint');
var mergeStream = require('merge-stream');
var minifyCSS = require('gulp-minify-css');
var nunjucks = require('nunjucks');
var order = require('gulp-order');
var requireDir = require('require-dir');
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var rewriteModule = require('http-rewrite-middleware');
var rjs = require('requirejs');
var stylus = require('gulp-stylus');
var through2 = require('through2');
var watch = require('gulp-watch');
var webserver = require('gulp-webserver');
var _ = require('underscore');

var config = require(process.env.GULP_CONFIG_PATH || '../../config');
var nunjucksBuild = require('./plugins/nunjucks-build');
var imgurlsAbsolutify = require('./plugins/imgurls-absolutify');
var imgurlsCachebust = require('./plugins/imgurls-cachebust');
var imgurlsParse = require('./plugins/imgurls-parse');
var paths = require('./paths');


requireDir('tasks');


// Which template to serve.
var template = (process.env.TEMPLATE || 'dev');
if (template.indexOf('.html') === -1) {
    template += '.html';
}

var PORT = parseInt(process.env.PORT || config.PORT || 8675, 10);
var LIVERELOAD_PORT = process.env.LIVERELOAD_PORT || PORT + 1000;

// Switch API settings.
if (process.env.API) {
    var api = config.serverConfig[process.env.API];

    if (!api) {
        console.log('Invalid argument for API. Possible options: ');
        console.log(Object.keys(config.serverConfig));
        process.exit(1);
    }

    gulp.src(config.JS_DEST_PATH + 'settings_local.js')
        .pipe(replace(/api_url: .*/g, "api_url: '" + api.api_url + "',"))
        .pipe(replace(/media_url: .*/g, "media_url: '" + api.media_url + "',"))
        .pipe(gulp.dest(config.JS_DEST_PATH));

    console.log('settings_local.js has been updated to use the specified API:');
    console.log('    api_url: ' + api.api_url);
    console.log('    media_url: ' + api.media_url);
}

gulp.task('settings_local_js_init', function() {
    // Creates a settings_local.js if it doesn't exist.
    fs.exists(config.JS_DEST_PATH + 'settings_local.js', function(exists) {
        if (!exists) {
            gulp.src(config.JS_DEST_PATH + 'settings_local.js.dist')
                .pipe(rename('settings_local.js'))
                .pipe(gulp.dest(config.JS_DEST_PATH));
        }
    });
});


gulp.task('bower_copy', function() {
    // Copy files from Bower into project.
    Object.keys(config.bowerConfig).forEach(function(source) {
        var dest = config.bowerConfig[source];
        gulp.src(paths.bower + source)
            .pipe(gulp.dest(dest));
    });
});


gulp.task('require_config', function() {
    gulp.src(paths.require)
        .pipe(insert.append(config.inlineRequireConfig))
        .pipe(gulp.dest(config.LIB_DEST_PATH));
});


function templatesBuild() {
    // Build Nunjucks templates into a templates.js file.
    // Takes about 200ms to compile all templates.
    return gulp.src(paths.html)
        .pipe(nunjucksBuild())
        .pipe(concat('templates.js'))
        .pipe(insert.prepend(
            '(function() {\n' +
            'var templates = {};\n'))
        .pipe(insert.append(
            'define("templates", ["core/nunjucks", "core/helpers"], function(nunjucks) {\n' +
            '    nunjucks.env = new nunjucks.Environment([], {autoescape: true});\n' +
            '    nunjucks.env.cache = nunjucks.templates = templates;\n' +
            '    console.log("Templates loaded");\n' +
            '    return nunjucks;\n' +
            '});\n' +
            '})();'
        ))
        .pipe(gulp.dest('src'));
}


gulp.task('templates_build', function() {
    templatesBuild();
});


gulp.task('templates_build_sync', function() {
    return templatesBuild();
});


function cssCompilePipe(stream) {
    // Compile .styl files into .styl.css files.
    // Takes about 2s to compile all CSS files.
    return stream
        .pipe(stylus().on('error', function(err) {
            console.log('Stylus compile error: ' + err.name);
            console.log(err.message);
        }))
        .pipe(rename(function(path) {
            path.extname = '.styl.css';
        }))
        .pipe(gulp.dest(config.CSS_DEST_PATH));
}


function cssCompile() {
    // Uses a helper function because it is also used by gulp-watch for
    // file-by-file CSS compiling.
    return cssCompilePipe(gulp.src(paths.styl));
}


gulp.task('css_compile', function() {
    cssCompile();
});


gulp.task('css_compile_sync', function() {
    return cssCompile();
});


gulp.task('css_bundles', ['css_compile_sync'], function() {
    // Read the config and build specified CSS bundles (like for splash.css).
    var streams = [];

    Object.keys(config.cssBundles || []).forEach(function(bundle) {
        streams.push(gulp.src(config.CSS_DEST_PATH + config.cssBundles[bundle])
            .pipe(concat(bundle))
            .pipe(gulpIf(!process.env.NO_MINIFY, minifyCSS()))
            .pipe(gulp.dest(config.CSS_DEST_PATH))
        );
    });

    // Yes, cross the streams.
    if (streams.length) {
        return mergeStream.apply(this, streams);
    }
});


gulp.task('css_build_sync', ['css_bundles', 'css_compile_sync'], function(done) {
    // Bundle and minify all the CSS into include.css.
    var excludes = Object.keys(config.cssBundles || []).map(function(bundle) {
        // Exclude generated bundles if any specified in the config.
        return bundle;
    });
    // Exclude previously generated builds.
    excludes.push(paths.include_css);
    // Exclude from project config.
    if (config.cssExcludes) {
        excludes = excludes.concat(config.cssExcludes);
    }
    excludes = excludes.map(function(css) { return '!' + config.CSS_DEST_PATH + css; });

    // Determine which CSS files and which order to concat through index.html.
    var css_files = [];
    var data = fs.readFileSync(path.resolve('src', 'dev.html'));
    data = data.toString();
    var css_pattern = new RegExp('href="/media/css/(.+.css)"', 'g');
    while (match = css_pattern.exec(data)) {
        css_files.push(match[1]);
    }
    css_src = css_files.map(function(css) {
        return config.CSS_DEST_PATH + css;
    });

    if (!css_src.length) {
        return done();
    }

    return gulp.src(css_src.concat(excludes))
        .pipe(stylus({compress: true}))
        .pipe(imgurlsCachebust())
        .pipe(gulpIf(!process.env.NO_MINIFY, minifyCSS()))
        .pipe(order(css_files,
                    {base: config.CSS_DEST_PATH}))
        .pipe(concat(paths.include_css))
        .pipe(gulp.dest(config.CSS_DEST_PATH));
});


gulp.task('imgurls_write', ['css_build_sync'], function() {
    // imgurls.txt is a list of cachebusted img URLs that is used by Zamboni
    // to generate the appcache manifest.
    gulp.src(config.CSS_DEST_PATH + paths.include_css)
        .pipe(imgurlsAbsolutify())
        .pipe(imgurlsParse())
        .pipe(rename('imgurls.txt'))
        .pipe(gulp.dest('src/media'));
});


gulp.task('buildID_write', function() {
    // Writes build ID to src/media/build_id.txt.
    var buildID = new Date().getTime().toString();
    gulpFile('build_id.txt', buildID)
        .pipe(gulp.dest('src/media'));
});


function walk(path) {
    var files = [];
    fs.readdirSync(path).forEach(function(filename) {
        var filePath = path + '/' + filename;
        var fileStat = fs.statSync(filePath);
        if (fileStat.isDirectory()) {
            files = files.concat(walk(filePath));
        } else {
            files.push(filePath);
        }
    });
    return files;
}

function findViewModules(path, prefix) {
    if (path.slice(-1) !== '/') {
        path = path + '/';
    }
    return walk(path + prefix).filter(function(file) {
        return file.slice(-3) === '.js';
    }).map(function(file) {
        return file.slice(0, -3).replace(path, '');
    });
}


function jsBuild(overrideConfig, cb) {
    /* r.js AMD optimizer.
     * Will read our RequireJS config to handle shims, paths, and name
     * anonymous modules.
     * Traces all modules and outputs them in the correct order.
     * Opts: https://github.com/jrburke/r.js/blob/master/build/example.build.js
     */
    overrideConfig = overrideConfig || {};
    if (process.env.NO_MINIFY) {
        overrideConfig.optimize = "none";
    }

    // Find all view modules in the views and core/views folder.
    var viewFiles = findViewModules(config.JS_DEST_PATH, 'views');
    var coreSourcePath = config.BOWER_PATH + 'marketplace-core-modules';
    var coreViewFiles = findViewModules(coreSourcePath, 'core/views');

    rjs.optimize(extend(true, {
        baseUrl: config.JS_DEST_PATH,
        findNestedDependencies: true,
        generateSourceMaps: true,
        include: ['lib/almond', 'main'].concat(viewFiles)
                                       .concat(coreViewFiles),
        insertRequire: ['core/init'],
        paths: _.extend(config.requireConfig.paths,
                        config.requireConfig.buildPaths),
        preserveLicenseComments: false,
        optimize: 'uglify2',
        out: config.JS_DEST_PATH + paths.include_js,
        shim: config.requireConfig.shim,
        wrapShim: true,
    }, overrideConfig), cb);
}


gulp.task('js_build', ['templates_build_sync'], function() {
    jsBuild();
});


// The second arg to FileSystemLoader is noWatch. It is set to true to disable watching.
var nunjucksEnv= new nunjucks.Environment(new nunjucks.FileSystemLoader('src', true));
gulp.task('index_html_build', function() {
    // Run Nunjucks templating on desired template.
    // Passing in MKT_COMPILED will use compressed assets in dev.html.
    // Copy desired template to index.html.
    // Inject livereload script into served template.
    var compiled = nunjucksEnv.render(template, {
        compiled: process.env.MKT_COMPILED
    });
    fs.writeFileSync(path.join('src', 'index.html'), compiled);

    gulp.src(path.join('src', 'index.html'))
        .pipe(insert.prepend('<!--This is a generated file from ' + template + '.-->\n' +
                             '<!--Read marketplace-frontend.readthedocs.org ' +
                             'for more information.-->\n\n'))
        .pipe(gulpIf(!process.env.MKT_COMPILED, replace(/<\/body>/,
              '<script src="http://localhost:' + LIVERELOAD_PORT +
              '/livereload.js"></script>\n</body>')))
        .pipe(rename('index.html'))
        .pipe(gulp.dest('src'));
});


gulp.task('webserver', ['index_html_build', 'templates_build'], function() {
    gulp.src(['src', 'bower_components'])
        .pipe(webserver({
            host: '0.0.0.0',
            fallback: 'index.html',
            middleware: rewriteModule.getMiddleware([
                {from: '^/media/js/lib/core/(.*)$',
                 to: '/marketplace-core-modules/core/$1'},
            ].concat(config.rewriteMiddleware || [])),
            port: PORT
        }));
});


gulp.task('lint', function() {
    // JSHint.
    var js = paths.js;
    js.splice(js.indexOf('src/templates.js'), 1);  // Skip templates.
    js = js.concat([
        // Skip lib files.
        '!' + config.LIB_DEST_PATH + '**/*.js',
        // Skip include.js.
        '!' + config.JS_DEST_PATH + paths.include_js
    ]);
    gulp.src(js)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});


gulp.task('clean', function() {
    del([
        config.CSS_DEST_PATH + 'splash.css',
        config.CSS_DEST_PATH + paths.include_css,
        config.JS_DEST_PATH + paths.include_js,
        config.JS_DEST_PATH + paths.include_js + '.map',
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


var compiledCSS = [];
function smartLiveReload(cssStream, liveReloadServer) {
    // Keep track of already-compiled CSS files and only trigger liveReload
    // if a CSS file has already been compiled so it doesn't fire on webserver
    // startup.
    return cssStream
        .pipe(through2.obj(function(chunk, enc, cb) {
            if (compiledCSS.indexOf(chunk.path) === -1) {
                compiledCSS.push(chunk.path);
            } else {
                var cssPath = config.CSS_DEST_PATH +
                              chunk.path.split(config.CSS_DEST_PATH)[1];
                liveReload.changed(cssPath, liveReloadServer);
            }
            cb();
        }));
}


gulp.task('watch', function() {
    // Watch and recompile on change.
    var liveReloadServer = liveReload.listen(LIVERELOAD_PORT);

    gulp.watch(paths.html, ['templates_build']);

    // CSS compilation uses gulp-watch to only compile modified files.
    var compiledCSS = [];
    gulp.src(paths.styl)
        .pipe(watch(paths.styl, function(files) {
            return smartLiveReload(cssCompilePipe(files), liveReloadServer);
        }));

    // Recompile all Stylus files if a lib file was modified.
    var showLibMsg = false;
    setTimeout(function() {
        showLibMsg = true;
    }, 2000);
    gulp.src(paths.styl_lib)
        .pipe(watch(paths.styl_lib, function(files) {
            if (showLibMsg) {
                console.log('Lib file changed. Recompiling all CSS.');
            }
            return cssCompilePipe(gulp.src(paths.styl));
        }));

    gulp.watch(paths.index_html, ['index_html_build']);
});


gulp.task('serve', ['webserver', 'css_compile', 'templates_build']);

gulp.task('default', ['watch', 'serve']);

gulp.task('update', ['settings_local_js_init', 'bower_copy',
                     'index_html_build', 'require_config']);

gulp.task('build', ['buildID_write', 'css_build_sync', 'js_build',
                    'templates_build_sync', 'imgurls_write']);


module.exports = {
    jsBuild: jsBuild,
    paths: paths
};
