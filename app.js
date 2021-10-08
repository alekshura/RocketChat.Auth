'use strict';

process.env.PORT = process.env.PORT || 8080;
process.env.KEYWORD_EXPIRE = process.env.KEYWORD_EXPIRE || 'expires';
process.env.DATE_EXPIRE_FORMAT = process.env.DATE_EXPIRE_FORMAT || 'DD-MM-YYYY HH:mm';
process.env.ROCKETCHAT_BOT_USER = process.env.ROCKETCHAT_BOT_USER || 'rocket.cat';
process.env.ROCKETCHAT_BOT_PASSWORD = process.env.ROCKETCHAT_BOT_PASSWORD || 'pwd';
process.env.ROCKETCHAT_ADMIN_PASSWORD = process.env.ROCKETCHAT_ADMIN_PASSWORD || 'pwd';
process.env.BCRYPT_PASSWORD_ROUND = process.env.BCRYPT_PASSWORD_ROUND || 10;
process.env.ROCKETCHAT_URL = process.env.ROCKETCHAT_URL || 'http://localhost:8099';
process.env.DOMAIN_URL = process.env.DOMAIN_URL || process.env.ROCKETCHAT_URL.substr(0, process.env.ROCKETCHAT_URL.indexOf('/', 10));
process.env.MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/rocketchat';
process.env.YOU_SYSTEM_INTEGRATION_URL = process.env.YOU_SYSTEM_INTEGRATION_URL || 'docker-localhost:8080';
process.env.YOU_SYSTEM_INTEGRATION_PATH = process.env.YOU_SYSTEM_INTEGRATION_PATH || '/api/users/auth';
process.env.ADMIN_ROLE = process.env.ADMIN_ROLE || 'User Administrator';
process.env.ROCKETCHAT_SU_PAT_TOKEN = process.env.ROCKETCHAT_SU_PAT_TOKEN || 'token';
process.env.ROCKETCHAT_SU_ID = process.env.ROCKETCHAT_SU_ID || 'id_hash';
process.env.ROCKETCHAT_CREATE_TOKEN_PATH = process.env.ROCKETCHAT_CREATE_TOKEN_PATH || '/api/v1/users.createToken';
process.env.ROCKETCHAT_DEFAULT_EMAIL_DOMAIN = process.env.ROCKETCHAT_DEFAULT_EMAIL_DOMAIN || 'google.com';
process.env.ROCKETCHAT_ADMIN = process.env.ROCKETCHAT_ADMIN || 'admin';
process.env.ROCKETCHAT_ADMIN_EMAIL = process.env.ROCKETCHAT_ADMIN_EMAIL || 'admin@gmail.com';
process.env.ROCKETCHAT_FROM_EMAIL = process.env.ROCKETCHAT_FROM_EMAIL || 'test@gmail.com';
process.env.ROCKETCHAT_SMTP_PROTOCOL = process.env.ROCKETCHAT_SMTP_PROTOCOL || 'smtps';
process.env.ROCKETCHAT_SMTP_HOST = process.env.ROCKETCHAT_SMTP_HOST || 'smtp.google.com';
process.env.ROCKETCHAT_SMTP_PORT = process.env.ROCKETCHAT_SMTP_PORT || '465';
process.env.ROCKETCHAT_SMTP_USERNAME = process.env.ROCKETCHAT_SMTP_USERNAME || 'test@google.com';
process.env.ROCKETCHAT_SMTP_PASSWORD = process.env.ROCKETCHAT_SMTP_PASSWORD || 'pwd';
process.env.SCHEDULE_TIMEOUT_IN_SECONDS = process.env.SCHEDULE_TIMEOUT_IN_SECONDS || 10;
process.env.LOGS_TS_FORMAT = process.env.LOGS_TS_FORMAT || 'DD-MM-YYYY HH:mm:ss.SSS';

const apm = require('elastic-apm-node').start()

export default apm;

import express from 'express';
import { urlencoded, json } from 'body-parser';
import cookieParser from "cookie-parser";

const app = express();
app.use(urlencoded({ extended: false }));
app.use(json());
app.use(cookieParser());

(async function init() {
	require('./rocketchat/util/logs');
	require('./rocketchat/ini');

	await require('./rocketchat/bot').default;
	const rocketchatApi = await require('./rocketchat/api').default;
	app.use('/auth-service/rocketchat', rocketchatApi);

	app.use(function (req, res) {
		console.log(req.path);
		res.send(req.path);
		// fs.createReadStream('index.html').pipe(res);
	});
	
	app.listen(process.env.PORT, function () {
		console.log(`Listening on port: ${process.env.PORT}!`);
	});
}());


/*
docker-compose -f docker-rocketchat.yml up -d mongo
docker-compose -f docker-rocketchat.yml up -d mongo-init-replica
docker-compose -f docker-rocketchat.yml up -d rocketchat
docker-compose -f docker-rocketchat.yml up -d --build auth-service


Rocketchat -> Administracja -> Konta -> Iframe:
	Odnośnik Iframe: https://local.zpwd.pl/auth-service/rocketchat/login
	Odnośnik API: https://local.zpwd.pl/auth-service/rocketchat/auth
	Metoda API: POST

Po zalogowaniu się na https://local.zpwd.pl wchodzimy na adres https://local.zpwd.pl/rocketchat
*/
