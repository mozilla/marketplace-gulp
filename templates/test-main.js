/*
    This file is generated from marketplace-gulp/templates.

    Sets up helpers and RequireJS for unit tests.
    marketplace-gulp reads the project's RequireJS config from config.js to
    reuse here.
*/
var allTestFiles = ['init'];
var TEST_REGEXP = /tests\/.*\.js$/i;

// Automatically clenaup sinon spies and stubs.
var realSinon = sinon;
beforeEach(function() {
    sinon = realSinon.sandbox.create();
});
afterEach(function() {
    sinon.restore();
    sinon = realSinon;
});

function withSettings(changes, test) {
    // Helper to setUp/tearDown settings during test that modifies settings.
    var settings = require('core/settings');
    var changed = {};
    Object.keys(changes).forEach(function(key) {
        // Remember if it exists so we can delete it if it doesn't.
        if (key in settings) {
            changed[key] = settings[key];
        }
        settings[key] = changes[key];
    });

    test();

    Object.keys(changes).forEach(function(key) {
        if (key in changed) {
            settings[key] = changed[key];
        } else {
            delete settings[key];
        }
    });
}

function pathToModule(path) {
    return path.replace(/^\/base\//, '').replace(/\.js$/, '');
}

Object.keys(window.__karma__.files).forEach(function(file) {
    if (TEST_REGEXP.test(file)) {
        // Normalize paths to RequireJS module names.
        allTestFiles.push(pathToModule(file));
    }
});

// Generated via config.js, inserted via marketplace-gulp.
var configPaths = {{ CONFIG_PATHS }};
var configShim = {{ CONFIG_SHIM }};

function bowerPath(path) {
    return '../../../bower_components/' + path;
}

function extend(a, b) {
    Object.keys(b).forEach(function(k) {
        a[k] = b[k];
    });
    return a;
}

require.config({
    // Karma serves files under /base, the basePath from your config file.
    baseUrl: '/base/src/media/js',

    paths: extend(configPaths, {
        'core': bowerPath('marketplace-core-modules/core'),
        'Squire': bowerPath('squire/src/Squire'),
        'tests': '../../../tests',
    }),

    shim: extend(configShim ,{
    }),
});


// Using this over `deps`/`callback` in `require.config` prevents Squire from
// running tests twice.
require(allTestFiles, function() {
    window.__karma__.start();
});
