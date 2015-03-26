# Common Makefile directives for Marketplace frontend projects that are usually
# aliases to Gulp tasks.

CASPERJS_BIN ?= 'casperjs'
CASPERJS_SHIM ?= 'node_modules/marketplace-gulp/tests/casper-shim.js'
SLIMERJSLAUNCHER ?= '/Applications/Firefox.app/Contents/MacOS/firefox'
SLIMERJS_VERSION ?= '0.10.0pre'
UITEST_FILE ?= 'tests/ui/'

gulp:
	@node_modules/.bin/gulp

serve:
	@node_modules/.bin/gulp

install:
	@npm install
	@node_modules/.bin/bower install --allow-root
	@node_modules/.bin/bower update --allow-root
	@node_modules/.bin/gulp update

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

init:
	@echo "'make init' has been removed. Use 'make install' instead."

update:
	@echo "'make update' has been removed. Use 'make install' instead."

test:
	make lint && make unittest && make uitest

uitest:
	make uitest-phantom && make uitest-slimer

uitest-phantom:
	TEST_URL=${TEST_URL} PATH=node_modules/.bin:${PATH} LC_ALL=en-US $(CASPERJS_BIN) test ${UITEST_FILE} --includes=${CASPERJS_SHIM} --engine=phantomjs

uitest-slimer:
	TEST_URL=${TEST_URL} SLIMERJSLAUNCHER=${SLIMERJSLAUNCHER} PATH=slimerjs:node_modules/.bin:${PATH} LC_ALL=en-US $(CASPERJS_BIN) test ${UITEST_FILE} --includes=${CASPERJS_SHIM} --engine=slimerjs

unittest: templates
	@node_modules/karma/bin/karma start --single-run

unittest-watch: templates
	@node_modules/karma/bin/karma start

test-langpacks:
	commonplace langpacks

upload-captures:
	@node_modules/.bin/gulp upload_captures
	exit 0

install-slimer:
	curl -O 'http://download.slimerjs.org/nightlies/latest-slimerjs-master/slimerjs-${SLIMERJS_VERSION}.zip'
	unzip slimerjs-${SLIMERJS_VERSION}.zip
	mv slimerjs-${SLIMERJS_VERSION} slimerjs
