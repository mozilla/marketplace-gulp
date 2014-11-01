# Common Makefile directives for Marketplace frontend projects that are usually
# aliases to Gulp tasks.

gulp:
	@node_modules/.bin/gulp

serve:
	@node_modules/.bin/gulp

update:
	@node_modules/.bin/gulp update

build:
	@node_modules/.bin/gulp build

css:
	@node_modules/.bin/gulp css_compile

templates:
	@node_modules/.bin/gulp templates_build

clean:
	@node_modules/.bin/gulp clean
