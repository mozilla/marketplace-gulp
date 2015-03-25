var path = require('path');

var gulp = require('gulp');
var request = require('request');
var through = require('through');


function uploadCaptures(options) {
    var fileCount = 0;
    var files = {};
    return through(function(file) {
        if (fileCount < options.limit) {
            files[path.basename(file.path)] = {
                content: file.contents.toString('base64'),
            };
            fileCount++;
        }
    }, function() {
        request.post('https://api.github.com/gists', {
            json: {files: files},
            headers: {
                'User-Agent': 'upload-captures v0.1',
            },
        }, function(error, response, body) {
            if (response.statusCode === 201) {
                Object.keys(body.files).forEach(function(file) {
                    var baseUrl = 'https://base64service.herokuapp.com/decode';
                    console.log(baseUrl + '?' + [
                        'url=' + body.files[file].raw_url,
                        'file=' + file,
                    ].join('&'));
                });
            } else {
                console.log('error uploading gist: ' + response.statusCode);
                console.log(body);
            }
        });
    });
}


gulp.task('upload_captures', function() {
    gulp.src('tests/captures/*.png')
        .pipe(uploadCaptures({limit: 5}));
});
