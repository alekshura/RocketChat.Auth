# <img src="/assets/logoRC.svg" align="left" heigth="100"> Authorization

## Intro
During implementation of corporate Web App one of the requirements was to have a fully functional chat for logged users.
The good modern Open Source candidate for it was [RockeChat](https://rocket.chat/).
It is fully functional chat, with possibility of online chating, sending images, audio, video streaming, etc.

## Challenges
 - Besides the installation and using the chat one important thing had to be realized: 
authorization of the users in RocketChat, that already have been authorized in the our Web App.
Such our authorized users do not exist in RocketChat database or not authorized, thus we needed to handle it.
 - Another thing, is actually RocketChat window with badges on the chat icon and online messages.
There was simple solution for itinvisible (layered) iframe with RocketChat. 
It becomes visible by clicking on Web App Chat icon.
In this way user RocketChat is always online and recevies massages and notifications.

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
One of the security requirements for sending messages was to add the possibility of message expiration: when user wants to message disapeared after some date.
It was achieved with specific message format with adding to it an expiration date and the RocketChat bot that was configured to recognize this date and cleanup such messages:

```javascript
// set up subscriptions - rooms we are interested in listening to
const subscribed = await driver.subscribeToMessages();
console.log('subscribed');

// connect the processMessages callback
const msgloop = await driver.reactToMessages(processMessages);
console.log('connected and waiting for messages');

// when a message is created in one of the ROOMS, we 
// receive it in the processMesssages callback

// greets from the first room in ROOMS 
// const sent = await driver.sendToRoom( BOTNAME + ' is listening ...',ROOMS[0]);
setTimeout(task, SCHEDULE_TIMEOUT_IN_SECONDS * 1000);

```

## Docker-compose
To start the service use `docker-compose`

```shell
docker-compose -f docker-rocketchat.yml up -d mongo
docker-compose -f docker-rocketchat.yml up -d mongo-init-replica
docker-compose -f docker-rocketchat.yml up -d rocketchat
docker-compose -f docker-rocketchat.yml up -d --build auth-service

```






