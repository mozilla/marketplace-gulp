/*
    Tasks related to making a production build.

    build -- all of the build steps grouped together.
    buildID_write -- writes build ID to src/media/build_id.txt for help the
                     server cachebust assets such as JS/CSS bundles.
    imgurls_write -- write list of cachebusted img URLs used by Zamboni to
                     generate appcache manifest.
*/
var gulpFile = require('gulp-file');
var rename = require('gulp-rename');

require('./css');
require('./js');
require('./templates');
var imgurlsAbsolutify = require('../plugins/imgurls-absolutify');
var imgurlsParse = require('../plugins/imgurls-parse');


gulp.task('build', ['buildID_write', 'css_build_sync', 'js_build',
                    'templates_build_sync', 'imgurls_write']);


gulp.task('buildID_write', function() {
    var buildID = new Date().getTime().toString();
    gulpFile('build_id.txt', buildID)
        .pipe(gulp.dest('src/media'));
});


gulp.task('imgurls_write', ['css_build_sync'], function() {
    gulp.src(MKT_CONFIG.CSS_DEST_PATH + MKT_PATHS.include_css)
        .pipe(imgurlsAbsolutify())
        .pipe(imgurlsParse())
        .pipe(rename('imgurls.txt'))
        .pipe(gulp.dest('src/media'));
});
