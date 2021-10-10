FROM node:14 AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./

RUN npm run build

FROM node:14
WORKDIR /usr/src/app

ENV NODE_ENV="production"

COPY package*.json ./
RUN npm ci --production
RUN npm cache clean --force

COPY --from=builder /usr/src/app/lib lib/

CMD [ "npm", "start" ]
