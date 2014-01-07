BIN = ./node_modules/.bin/

test:
	@NODE_ENV=test $(BIN)mocha \
		--harmony \
		--require should \
		--reporter spec \
		--bail

.PHONY: test