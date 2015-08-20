JSHINT=./node_modules/.bin/jshint
JSCS=./node_modules/.bin/jscs


.PHONY: all
all:: git-hooks
all:: clean
all:: install
all:: rebuild

#remove builded files
.PHONY: clean
clean::
	rm -f `find ./app/*/* ! -name '*bemdecl.js'`

#install dependenses
.PHONY: install
install::
	npm install

#rebuild project (use it when adding new files)
.PHONY: rebuild
rebuild::
	./node_modules/enb/bin/enb make


.PHONY: jshint
jshint:: $(subst .js,.jshint,$(shell find ./blocks/ -type f -name '*.js' -a -not -path '*.i18n*' -a -not -name '*\.deps.js'))
jshint.last:: $(subst .js,.jshint,$(shell git status -s | grep -Ee '^\s?(M|A|C)' | grep -Ee '\.js$$' | grep -vEe 'deps|\.i18n' | awk '{print $$2}' | sort | uniq))
%.jshint :
	@echo "$*.js"
	@$(JSHINT) --config .jshintrc $*.js

.PHONY: jscs
jscs:: $(subst .js,.jscs,$(shell find ./blocks/ -type f -name '*.js' -a -not -path '*.i18n*' -a -not -name '*\.deps.js'))
jscs.last:: $(subst .js,.jscs,$(shell git status -s | grep -Ee '^\s?(M|A|C)' | grep -Ee '\.js$$' | grep -vEe 'deps|\.i18n' | awk '{print $$2}' | sort | uniq))
%.jscs :
	@echo "$*.js"
	@$(JSCS) $*.js --config=.jscsrc


.PHONY: git-hooks
git-hooks:
	@[ -f .git/hooks/pre-commit ] || ln -s ../../git-hooks/pre-commit .git/hooks/pre-commit && true


.PHONY: test
test:: clean
test:: install
test:: rebuild
test::
	$(shell pkill -f "app/test/test.server.js")
	node app/test/test.server.js --socket 3000 --workers 1 &
	sleep 2
	./node_modules/mocha-phantomjs/bin/mocha-phantomjs http://127.0.0.1:3000/
	$(shell pkill -f "app/test/test.server.js")

