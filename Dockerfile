# --------------> The build image__
FROM node:latest AS build
WORKDIR /usr/src/app
COPY package*.json /usr/src/app/
RUN npm install
COPY bower*.json /usr/src/app/
RUN bower install

# --------------> The production image__
FROM node:20.5.1-bullseye-slim
# FROM node:20
ENV NODE_ENV production
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=node:node . /usr/src/app
CMD ["npm", "start"]
