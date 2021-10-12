# <img src="/assets/logoRC.svg" align="left"> Authorization

![GitHub top language](https://img.shields.io/github/languages/top/alekshura/RocketChat.Auth)


## Intro
During implementation of corporate Web App one of the requirements was to have a fully functional chat for logged users.
The good modern Open Source candidate for it was [RocketChat](https://github.com/RocketChat/Rocket.Chat#readme).
It is fully functional chat, with possibility of online chating, sending images, audio, video streaming, etc.

## Challenges
 - Besides the installation and using the chat one important thing had to be realized: 
authorization of the users in RocketChat, that already have been authorized in the Web App.
These authorized users do not exist in RocketChat database or are not online, thus we needed to handle it.
 - Another thing, is actually RocketChat window with badges on the Web App chat icon and online receive messages and notifications.
There was simple solution for it: invisible (layered) iframe with RocketChat. It becomes visible by clicking on Web App Chat icon.
In this way RocketChat is always opened and user recevies massages and notifications.

## Authorization
To authorize uses in RocketChat `auth-service` was created using `nodejs`. It was natural choice because RocketChat also written on `nodejs`
with persistence in `MongoDb` database. 
To enable RocketChat use the service, it should be configured:

Rocketchat -> Administration -> Accounts -> Iframe:
 - Iframe: https://your-system-domain.com/auth-service/rocketchat/login
 - API: https://your-system-domain.com/auth-service/rocketchat/auth
 - API verb: POST
 

`auth-service` exposes `login` and `auth` API methods for RocketChat. 
`login` method actually sets RocketChat auth cookies to tell it that user is authorized, whether 
`auth` method sets in RocketChat database info about user, that has been logged in Web App. If such user does not exist in 
RocketChat database it added to it:

```javascript
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

```

## Bot
One of the security requirements for chat messages was the possibility of message disapering after message expiration date setup by user.
It was achieved with specific expiration date format sent in message and the RocketChat bot that was used to recognize this format and delete messages that contained suth information.

RocketChat bot has been created in the way: 

```javascript
// set up subscriptions - rooms we are interested in listening to
const subscribed = await driver.subscribeToMessages();
console.log('subscribed');

// connect the processMessages callback
const msgloop = await driver.reactToMessages(processMessages);
console.log('connected and waiting for messages');

// when a message is created in one of the ROOMS, we 
// receive it in the processMesssages callback

// const sent = await driver.sendToRoom( BOTNAME + ' is listening ...', ROOMS[0]);
setTimeout(task, SCHEDULE_TIMEOUT_IN_SECONDS * 1000);

```

and the `task` method actually does the job.

## Docker-compose
To start the service use `docker-compose`

```shell
docker-compose -f docker-rocketchat.yml up -d mongo
docker-compose -f docker-rocketchat.yml up -d mongo-init-replica
docker-compose -f docker-rocketchat.yml up -d rocketchat
docker-compose -f docker-rocketchat.yml up -d --build auth-service

```






