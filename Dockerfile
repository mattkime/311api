FROM meetup/node-yarn:7.5.0-0.19.1

RUN useradd --user-group --create-home --shell /bin/false api

ENV NODE_PATH=/home/api/node_modules
ENV PATH=/home/api/node_modules/.bin/:$PATH

# cache builds
# only rebuild if package.json has changed
WORKDIR /home/api/
COPY package.json yarn.lock /home/api/

RUN yarn install --pure-lockfile && yarn cache clean
EXPOSE 8000

# copy app code to container
WORKDIR /home/api/311api
COPY . /home/api/311api
RUN chown -R api:api /home/api/311api

USER api

CMD ["npm","start"]
