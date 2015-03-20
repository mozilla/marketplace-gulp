/*
    Tasks related to linting, minifying, bundling, and AMD-optimizing JS
    modules.

    js_build -- runs RequireJS's AMD optimizer over our JS modules. Reads
                our RequireJS config (that we also use in development) to
                handle shims, paths, and names anonymous modules. Traces all
                modules and outputs them in the correct order.
    settings_local_js_init -- bootstraps a project with a settings_local.js if
                              it doesn't yet exist.
    lint -- JSHints your crappy code.
*/
var fs = require('fs');

var extend = require('node.extend');
var jshint = require('gulp-jshint');
var rjs = require('requirejs');

require('./templates');


gulp.task('js_build', ['templates_build_sync'], function() {
    jsBuild();
});


gulp.task('lint', function() {
    var js = MKT_PATHS.js;
    js.splice(js.indexOf('src/templates.js'), 1);  // Skip templates.
    js = js.concat([
        // Skip lib files.
        '!' + MKT_CONFIG.LIB_DEST_PATH + '**/*.js',
        // Skip include.js.
        '!' + MKT_CONFIG.JS_DEST_PATH + MKT_PATHS.include_js,
        // Skip l10n.js.
        '!' + MKT_CONFIG.JS_DEST_PATH + 'l10n.js'
    ]);
    gulp.src(js)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});


gulp.task('settings_local_js_init', function() {
    // Creates a settings_local.js if it doesn't exist.
    fs.exists(MKT_CONFIG.JS_DEST_PATH + 'settings_local.js',
              function(exists) {
        if (!exists) {
            gulp.src(MKT_CONFIG.JS_DEST_PATH + 'settings_local.js.dist')
                .pipe(rename('settings_local.js'))
                .pipe(gulp.dest(MKT_CONFIG.JS_DEST_PATH));
        }
    });
});


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
    // RTD: https://github.com/jrburke/r.js/blob/master/build/example.build.js
    overrideConfig = overrideConfig || {};
    if (process.env.MKT_NO_MINIFY) {
        overrideConfig.optimize = "none";
    }

    // Find all view modules in the views and core/views folder.
    var viewFiles = findViewModules(MKT_CONFIG.JS_DEST_PATH, 'views');
    var coreSourcePath = MKT_CONFIG.BOWER_PATH + 'marketplace-core-modules';
    var coreViewFiles = findViewModules(coreSourcePath, 'core/views');

    rjs.optimize(extend(true, {
        baseUrl: MKT_CONFIG.JS_DEST_PATH,
        findNestedDependencies: true,
        generateSourceMaps: true,
        include: ['lib/almond', 'main'].concat(viewFiles)
                                       .concat(coreViewFiles),
        insertRequire: ['main'],
        paths: extend(MKT_CONFIG.requireConfig.paths,
                      MKT_CONFIG.requireConfig.buildPaths),
        preserveLicenseComments: false,
        optimize: 'uglify2',
        out: MKT_CONFIG.JS_DEST_PATH + MKT_PATHS.include_js,
        shim: MKT_CONFIG.requireConfig.shim,
        wrapShim: true,
    }, overrideConfig), cb);
}


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


module.exports = {
    jsBuild: jsBuild
};
