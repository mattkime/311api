CI_BUILD_NUMBER ?= $(USER)-snapshot
CI_WORKDIR ?= $(shell pwd)
PROJECT = unknown
CLUSTER = unknown
ZONE = asia-east1-c

PUBLISH_TAG_APP = api-server

# lists all available targets
list:
	@sh -c "$(MAKE) -p no_op__ | \
		awk -F':' '/^[a-zA-Z0-9][^\$$#\/\\t=]*:([^=]|$$)/ {split(\$$1,A,/ /);\
		for(i in A)print A[i]}' | \
		grep -v '__\$$' | \
		grep -v 'make\[1\]' | \
		grep -v 'Makefile' | \
		sort"

# required for list
no_op__:

__package:
	docker build -t $(PUBLISH_TAG_APP) .

run-local: __package
	docker run \
		--rm \
		-it \
		-p 8000:8000 \
		$(PUBLISH_TAG_APP)
