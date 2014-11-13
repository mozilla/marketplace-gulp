# Common Makefile directives for Marketplace frontend projects that are usually
# aliases to Gulp tasks.

gulp:
	@node_modules/.bin/gulp

serve:
	@node_modules/.bin/gulp

install:
	@npm install
	@node_modules/.bin/bower install --allow-root
	@node_modules/.bin/bower update --allow-root
	@node_modules/.bin/gulp update

update: install

build:
	@node_modules/.bin/gulp build

css:
	@node_modules/.bin/gulp css_compile

templates:
	@node_modules/.bin/gulp templates_build

lint:
	@node_modules/.bin/gulp lint

clean:
	@node_modules/.bin/gulp clean
