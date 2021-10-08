import { Router } from 'express';
const router = Router();
import fetch from 'node-fetch';
import { MongoClient } from 'mongodb';
const CORS_URL = process.env.DOMAIN_URL;
import { generateLoginToken as _generateLoginToken } from './util/utils';
export default router;

// CORS setup
router.use((req, res, next) => {
	res.set('Access-Control-Allow-Origin', CORS_URL);
	res.set('Access-Control-Allow-Credentials', 'true');
	next();
});

function findAuthorizationHeader(headers, name) {
	if (!headers.authorization) {
		return null;
	}

	let pairs = headers.authorization.split(",");

	if (!pairs || pairs.length === 0) {
		return null;
	}

	for (var pair of pairs) {
		let tokens = pair.split('=');
		if (tokens.length !== 2) {
			continue;
		}

		let key = tokens[0].trim();

		if (key === name) {
			return tokens[1].trim().split('"').join('').trim();
		}
	}

	return null;
}

async function resolveUser(headers) {
	// This is old style passing for account Id
	// For now best way to share it in JWT claims
	let accountId = findAuthorizationHeader(headers, 'accountId');

	if (!accountId) {
		throw `Invalid authorization headers: ${headers.authorization}'`;
	}

	let userInfo = await fetch(process.env.YOU_SYSTEM_INTEGRATION_URL + process.env.YOU_SYSTEM_INTEGRATION_PATH + accountId, {
		headers: headers
	}).then(function (response) {
		if (!response.ok) {
			throw response;
		}
		return response.json();
	});

	// Use here yours logic
	if (!userInfo || !userInfo.roles || !userInfo.isActive) {
		throw `No valid user found: '${ JSON.stringify(userInfo) }'`;
	}
	return userInfo;
}

async function ensureUser(db, userInfo, overrideUser) {
	let rcUser = {
		id: userInfo.id,
		username: userInfo.login,
		email: userInfo.email || userInfo.login + '@' + process.env.ROCKETCHAT_DEFAULT_EMAIL_DOMAIN,
		name: userInfo.detais ? userInfo.detais.firstName + " " + userInfo.detais.lastName : userInfo.roles[0].name,
		roles: ['user']
	};

	if (userInfo.roles[0].role) {
		for(var role of userInfo.roles[0].role){
			if (role.bame === process.env.ADMIN_ROLE){
				rcUser.roles.push('admin');
			}
		}
	}

	if (overrideUser) {
		overrideUser(rcUser);
	}

	let users = db.collection('users');
	let user = await users.findOne({ _id: rcUser.id });

	if (user) {
		await users.updateOne({ _id: rcUser.id }, {
			$set: {
				name: rcUser.name,
				username: rcUser.username,
				active: true,
				roles: rcUser.roles,
			}
		});

		console.log(`User updated: '${rcUser.id}'`);
		return rcUser.id;
	}

	await users.insertOne({
		_id: rcUser.id,
		createdAt: new Date(),
		emails: [{
			address: rcUser.email,
			verified: true
		}],
		name: rcUser.name,
		username: rcUser.username,
		active: true,
		statusDefault: 'online',
		roles: rcUser.roles,
		type: 'user'
	});

	console.log(`User created: '${rcUser.id}'`);
	return rcUser.id;
}

async function callCreateToken(userId) {
	let result = await fetch(process.env.ROCKETCHAT_URL + process.env.ROCKETCHAT_CREATE_TOKEN_PATH, {
		method: 'post',
		headers: {
			'X-Auth-Token': process.env.ROCKETCHAT_SU_PAT_TOKEN,
			'X-User-Id': process.env.ROCKETCHAT_SU_ID,
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		},
		body: JSON.stringify({
			"userId": userId
		})
	}).then(function (response) {
		if (!response.ok) {
			throw response;
		}

		return response.json();
	});

	if (!result.success) {
		throw result;
	}

	return result;
}

async function createAuthToken(db, userId) {
	let result = await callCreateToken(userId);

	let users = db.collection('users');
	await users.updateOne({_id: userId}, {
		$set: {
			status: 'online'
		}
	});

	console.debug("auth token created");
	return result;
}

async function createLoginToken(db, userId) {
	let result = await callCreateToken(userId);

	let users = db.collection('users');
	await users.updateOne({_id: userId}, {
		$set: {
			status: 'online'
		}
	});

	console.debug("login token created");

	return { loginToken: result.data.authToken };
}

function handleLogin(headers, rcUser, userInfo) {
	let login = findAuthorizationHeader(headers, 'login');
	if (login && userInfo.login.toLowerCase() !== login.toLowerCase()) {
		rcUser.id = login + '#' + rcUser.id;
		rcUser.email = login + '@' + process.env.ROCKETCHAT_DEFAULT_EMAIL_DOMAIN;
		rcUser.username = rcUser.email;
		rcUser.name = login;
		rcUser.roles.push('admin');
	}

	// Use concrete User structure
	// struct rcUser {
	// 	id,
	// 	username,
	// 	email,
	// 	name,
	// 	roles,
	// };
}

async function handle(req, res, func) {
	let client = null;
	try {
		let userInfo = await resolveUser(req.headers);

		client = await MongoClient.connect(process.env.MONGO_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
		let db = client.db();

		let userId = await ensureUser(db, userInfo, function (rcUser) {
			handleLogin(req.headers, rcUser, userInfo);
		});

		let result = await func(db, userId);

		return res.json(result);

	} catch (e) {
		console.error(`Exception while processing user request: '${(req.headers.authorization)}':`);
		console.error(e);
		return res.sendStatus(401);
	} finally {
		if (client) {
			client.close();
		}
	}
}

async function handleAuth(req, res) {
	return handle(req, res, createLoginToken);
}

async function handleToken(req, res) {
	return handle(req, res, createAuthToken);
}

async function generateLoginToken(req, res) {
	return res.json({result: _generateLoginToken()});
}

router.get('/login', function (req, res) {
	let location = req.protocol + '://' + req.get('host') + req.originalUrl;
	res.cookie('rc_token', '', { httpOnly: true }); //maxAge: 0,
	res.cookie('rc_uid', '', { httpOnly: true });
	res.set('location', location);
	res.sendStatus(302);
	console.log(`Login location: '${location}'`);
	console.log(new Date().toString());
	console.log(new Date().toISOString());
	console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
});
router.get('/init', function (req, res) {
	res.cookie('rc_token', '', { httpOnly: true });
	res.cookie('rc_uid', '', { httpOnly: true });
	res.sendStatus(200);
});
router.get('/auth', handleAuth);
router.post('/auth', handleAuth);
router.get('/token', handleToken);
router.get('/generateLoginToken', generateLoginToken);
router.get('/liveness', function (req, res) {
	res.sendStatus(200);
});
