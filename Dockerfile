FROM node:18-alpine

RUN npm install -g serve

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY --chown=node:node package.json ./

USER node

RUN npm install

COPY --chown=node:node public/ ./public
COPY --chown=node:node src/ ./src

RUN npm run build

EXPOSE 3000

CMD ["serve", "-s", "build"]