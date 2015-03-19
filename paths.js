/*
    Path globs for DRYness.
*/
var paths = {
    bower: MKT_CONFIG.BOWER_PATH,
    css: MKT_CONFIG.CSS_DEST_PATH + '**/*.css',
    styl_compiled: MKT_CONFIG.CSS_DEST_PATH + '**/*.styl.css',
    styl_lib: [MKT_CONFIG.CSS_DEST_PATH + 'lib.styl',
               MKT_CONFIG.CSS_DEST_PATH + 'lib/**/*.styl'],
    html: 'src/templates/**/*.html',
    include_css: 'include.css',
    include_js: 'include.js',
    index_html: ['src/*.html', '!src/index.html'],
    js: [MKT_CONFIG.JS_DEST_PATH + '**/*.js', 'src/templates.js'],
};
paths.require = paths.bower + 'requirejs/require.js';
paths.styl = [MKT_CONFIG.CSS_DEST_PATH + '**/*.styl'].concat(
    // Don't include lib in main styl glob.
    paths.styl_lib.map(function(glob) {
        return '!' + glob;
    })
);

module.exports = paths;
