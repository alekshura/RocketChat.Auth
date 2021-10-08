FROM node:14

WORKDIR /icu
RUN npm init -y && npm install full-icu
ENV NODE_ICU_DATA=/icu/node_modules/full-icu

ENV TZ=Europe/Warsaw
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
EXPOSE 9229
#CMD [ "node", "--inspect-brk=0.0.0.0", "app.js" ]
#CMD [ "node", "--inspect=0.0.0.0", "app.js" ]
#CMD [ "node", "--trace-warnings", "app.js" ]
CMD [ "node", "app.js" ]
