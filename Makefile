CI_BUILD_NUMBER ?= $(USER)-snapshot
CI_WORKDIR ?= $(shell pwd)
PROJECT = 311api
CLUSTER = cluster-1
ZONE = us-east1-b

PUBLISH_TAG_APP = "mattkime/api-server:$(CI_BUILD_NUMBER)"

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

package:
	@echo "someday this will do a thing"

version:
	@echo $(CI_BUILD_NUMBER)

publish:
	docker push $(PUBLISH_TAG_APP)

deploy: package

run-local: __package
	docker run \
		--rm \
		-it \
		-p 3000:3000 \
		$(PUBLISH_TAG_APP)
