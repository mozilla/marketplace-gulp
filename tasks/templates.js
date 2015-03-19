/*
    Tasks related to templates such as the index.html or Nunjucks templates.

    index_html_build -- compiles the dev.html template into index.html. Since
                        dev.html can take options such as whether to run
                        as a production environment with MKT_COMPILED=1 or
                        what port the LiveReload server is running on.
    templates_build -- compiles all Nunjucks templates into src/templates.js.
                      Note that it will run through a custom Nunjucks Gulp
                      plugin that further optimizes (monkey-patches) the
                      default Nunjucks compiler. It inserts a define call to
                      make it an AMD module.
    templates_build_sync -- sync version of templates_build so that the JS
                            builder can wait until the templates.js is
                            compiled.
*/
var fs = require('fs');
var path = require('path');

var concat = require('gulp-concat');
var gulpIf = require('gulp-if');
var insert = require('gulp-insert');
var nunjucks = require('nunjucks');
var rename = require('gulp-rename');
var replace = require('gulp-replace');

var nunjucksBuild = require('../plugins/nunjucks-build');


// Second arg to FileSystemLoader is noWatch. Set to true to disable watching.
var nunjucksEnv = new nunjucks.Environment(
    new nunjucks.FileSystemLoader('src', true));


// Which template to serve.
var TEMPLATE_SERVE = (process.env.TEMPLATE || 'dev');
if (TEMPLATE_SERVE.indexOf('.html') === -1) {
    TEMPLATE_SERVE += '.html';
}


gulp.task('index_html_build', function() {
    var compiled = nunjucksEnv.render(TEMPLATE_SERVE, {
        compiled: process.env.MKT_COMPILED
    });
    fs.writeFileSync(path.join('src', 'index.html'), compiled);

    gulp.src(path.join('src', 'index.html'))
        .pipe(insert.prepend(
            '<!--This is a generated file from ' + TEMPLATE_SERVE + '.-->\n' +
            '<!--Read marketplace-frontend.readthedocs.org ' +
            'for more information.-->\n\n'))
        .pipe(gulpIf(!process.env.MKT_COMPILED, replace(/<\/body>/,
              '<script src="http://localhost:' + MKT_LIVERELOAD_PORT +
              '/livereload.js"></script>\n</body>')))
        .pipe(rename('index.html'))
        .pipe(gulp.dest('src'));
});


gulp.task('templates_build', function() {
    templatesBuild();
});


gulp.task('templates_build_sync', function() {
    return templatesBuild();
});


function templatesBuild() {
    // Build Nunjucks templates into a templates.js file. Takes about 200ms.
    return gulp.src(MKT_PATHS.html)
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
