import { driver, api } from '@rocket.chat/sdk';
import { MongoClient } from 'mongodb';
import moment from 'moment';
import { startTransaction, captureError, startSpan } from '../app';

const EXPIRE_KEYWORD = '`' + process.env.KEYWORD_EXPIRE;
const DATE_FORMAT = process.env.DATE_EXPIRE_FORMAT;
const HR_DATE_FORMAT = DATE_FORMAT + ' or s|m|g|d number';
const EXPIRE_FORMAT = EXPIRE_KEYWORD + ' ' + DATE_FORMAT + '` or ' + EXPIRE_KEYWORD + ' s|m|g|d number' + '`';
const ROOMS = ['GENERAL'];
const SCHEDULE_TIMEOUT_IN_SECONDS = parseInt(process.env.SCHEDULE_TIMEOUT_IN_SECONDS, 10);

var myuserid;
// this simple bot does not handle errors, different message types, server resets 
// and other production situations 

const runbot = async () => {
    let trans = null;

    try {
        trans = startTransaction('runbot', 'init');
        if (trans) trans.result = 'success';

        var conn = null;
        var cnt = 3;
        while (cnt > 0) {
            try {
                cnt = cnt - 1;
                conn = await driver.connect({
                    host: process.env.ROCKETCHAT_URL,
                    useSsl: process.env.ROCKETCHAT_URL.toLowerCase().startsWith('https')
                });
                myuserid = await driver.login({
                    username: process.env.ROCKETCHAT_BOT_USER,
                    password: process.env.ROCKETCHAT_BOT_PASSWORD
                });
                break;
            } catch (e) {
                captureError(e);
                console.info('Can not connect to Rocket.Chat via SDK');
                if (cnt === 0) {
                    throw e;
                }
                console.info('Trying another time...');
            }
        }

        console.log('joined rooms');
    
        // set up subscriptions - rooms we are interested in listening to
        const subscribed = await driver.subscribeToMessages();
        console.log('subscribed');
    
        // connect the processMessages callback
        const msgloop = await driver.reactToMessages(processMessages);
        console.log('connected and waiting for messages');
    
        // when a message is created in one of the ROOMS, we 
        // receive it in the processMesssages callback
    
        // // greets from the first room in ROOMS 
        // const sent = await driver.sendToRoom( BOTNAME + ' is listening ...',ROOMS[0]);
        // console.log('Greeting message sent');
    
        setTimeout(task, SCHEDULE_TIMEOUT_IN_SECONDS * 1000);
    } catch (e) {
        captureError(e);
        if (trans) trans.result = 'error';

        console.error(`runbot error:`);
        console.error(e);

        setTimeout(function () {
            if (trans) trans.end();
            runbot();
        }, 120000);
    } finally {
        if (trans) trans.end();
    }
};

// callback for incoming messages filter and processing
const processMessages = async (err, message, messageOptions) => {
    if (err) {
        return;
    }

    if (message.u._id === myuserid) {
        return;
    }

    const trans = startTransaction('process-message', 'interceptor');
    if (trans) trans.result = 'success';

    let text = message.msg, lowerCase = text.toLowerCase();
    try {
        let date = await parseExpireDate(text, lowerCase);
        if (date) {
           let result = await setExpireDate(message, date);
           console.log(result);
        }
    } catch (e) {
        captureError(e)
        if (trans) trans.result = 'error';
        let result = await driver.sendDirectToUser(e, message.u.username).catch(function (e) {
            return e;
        });
        console.log(result);
    } finally {
        if (trans) trans.end();
    }
};

const parseExpireDate = async (message, lowerCaseMessage) => {
    let text = lowerCaseMessage || message.toLowerCase();
    let start = text.indexOf(EXPIRE_KEYWORD);
    if (start < 0) {
        return;
    }
    start += EXPIRE_KEYWORD.length;
    while (text[start] == ' ') {
        ++start;
    }

    let end = text.indexOf('`', start);
    if (end < 0) {
        throw `Wrong format '${EXPIRE_FORMAT}' in the message: ${message}`;
    }

    let ds = text.substring(start, end).trim();
    if (ds[0] == 's' && (+ds.substr(1))) {
        return new Date(Date.now() + 1000 * (+ds.substr(1)));
    }
    if (ds[0] == 'm' && (+ds.substr(1))) {
        return new Date(Date.now() + 1000 * 60 * (+ds.substr(1)));
    }
    if (ds[0] == 'g' && (+ds.substr(1))) {
        return new Date(Date.now() + 1000 * 60 * 60 * (+ds.substr(1)));
    }
    if (ds[0] == 'd' && (+ds.substr(1))) {
        return new Date(Date.now() + 1000 * 60 * 60 * 24 * (+ds.substr(1)));
    }

    let date = moment(ds, DATE_FORMAT, true).toDate();
    if (!date || !date.getTime()) {
        throw `Date: ${ds} does not have format: '${HR_DATE_FORMAT}'`;
    }

    if (date < new Date()) {
        throw `Date: ${ds} is in the past`;
    }

    return date;
};

const setExpireDate = async (message, date) => {
	let client = null;
    let trans = null;
    try {
	    trans = startSpan('set-message-expire');
        if (trans) trans.result = 'success';

		client = await MongoClient.connect(process.env.MONGO_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
		let db = client.db();
		let table = db.collection('message_expire');
        
        if (await table.findOne({ _id: message._id })) {
            return;
        }

	    await table.insertOne({
            _id: message._id,
            roomId: message.rid,
            tillDate: date
        });

        await driver.sendDirectToUser(`Expiration date is set up on: "${moment(date).format(DATE_FORMAT)}"`, message.u.username);
		console.log(`Message '${message._id}' expire date '${date.toString()}'`);
	} catch (e) {
	    captureError(e);
        if (trans) trans.result = 'error';
		console.error(e);
	} finally {
		if (client) {
			client.close();
		}
        if (trans) trans.end();
	}
};

async function task () {
    let client = null, logged = false;
    let trans = null;
    try {
        trans = startTransaction('delete-expired-messages-task', 'job');
        if (trans) trans.result = 'success';

        client = await MongoClient.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        let db = client.db();
        let table = db.collection('message_expire');

        let items = await (await table.find({ tillDate: { $lte : new Date() }})).toArray();
        if (items.length) {
            if (!api.loggedIn()) {
                await api.login({ username: process.env.ROCKETCHAT_BOT_USER, password: process.env.ROCKETCHAT_BOT_PASSWORD });
            }

            logged = true;
            for (let i = 0; i < items.length; ++i) {
                let item = items[i];
                try {
                    if (item._id && item.roomId) {
                        let result = await api.post('chat.delete', { roomId: item.roomId, msgId: item._id, asUser: true });
                        console.log(result);
                    }

                    await table.deleteOne({ _id: item._id });
                } catch (e) {
                    if (trans) trans.result = 'partial-error';
                    captureError(e);
                    console.error(e);
                }
            }
        }
    } catch (e) {
        if (trans) trans.result = 'error';
        captureError(e);
        console.error(e);
    } finally {
        if (client) {
            client.close();
        }
        if (logged) {
            api.logout();
        }
        if (trans) trans.end();
    }

    setTimeout(task, SCHEDULE_TIMEOUT_IN_SECONDS * 1000);
};

export default runbot();
