CI_BUILD_NUMBER ?= $(USER)-snapshot-2
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

package:
	docker build -t $(PUBLISH_TAG_APP) .

version:
	@echo $(CI_BUILD_NUMBER)

publish:
	docker push $(PUBLISH_TAG_APP)

deploy: package publish
	docker pull arukasio/arukas:latest
	docker run --rm \
		-e ARUKAS_JSON_API_TOKEN=$(ARUKAS_JSON_API_TOKEN) \
		-e ARUKAS_JSON_API_SECRET=$(ARUKAS_JSON_API_SECRET) \
			arukasio/arukas run \
			--instances=1 \
			--mem=512 \
			--app-name="311api" \
			--name="311api" \
			--ports=3000:tcp \
				$(PUBLISH_TAG_APP)

run-local: package
	docker run \
		--rm \
		-it \
		-p 3000:3000 \
		$(PUBLISH_TAG_APP)
