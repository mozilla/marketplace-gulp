var v;

if (require.globals) {
    // SlimerJS
    require.globals.casper = casper;
    casper.echo('Running under SlimerJS', 'WARN');
    v = slimer.version;
    casper.isSlimer = true;
} else {
    // PhantomJS
    casper.echo('Running under PhantomJS', 'WARN');
    v = phantom.version;
}
casper.echo('Version: ' + v.major + '.' + v.minor + '.' + v.patch);

function setGlobal(name, module) {
    if (require.globals) {
        require.globals[name] = module;
    }
}

// Require helpers.
function localRequire(path) {
    return require(require('fs').absolute(path));
}

function globalRequire(path, name) {
    var module = localRequire(path);
    setGlobal(name, module);
    return module;
}

setGlobal('localRequire', localRequire);

// Require globals.
var _ = globalRequire('node_modules/underscore/underscore', '_');

var helpers = _.extend(
    localRequire('node_modules/marketplace-gulp/tests/casper-helpers'),
    localRequire('tests/lib/helpers'));
setGlobal('helpers', helpers);
