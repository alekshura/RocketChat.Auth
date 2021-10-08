import { readdir as _readdir } from 'fs';
import { promisify } from 'util';
import { MongoClient } from 'mongodb';

const readdir = promisify(_readdir);
const init = async () => {
	let client = null;
	try {
		client = await MongoClient.connect(process.env.MONGO_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true
		});
		let db = client.db();
        let settings = db.collection('rocketchat_settings');
        let result = await settings.findOne({ _id: 'Show_Setup_Wizard' });
        if (result.value != 'pending') {
            return;
        }
        
        let dir = __dirname + '/ini', files = await readdir(dir);
        for (let f = 0; f < files.length; ++f) {
            let file = files[f], name = file.substr(0, file.lastIndexOf('.'));
            let mod = require(dir + '/' + name);
            let collection = db.collection(name);
            for (let n in mod) {
                let v = typeof (mod[n]) === 'function' ? await mod[n]({ ...process.env }) : mod[n];
                if (n == '_id') {
                    for (let _id in v) {
                        let u = v[_id];
                        await collection.updateOne({ _id: _id }, { $set: u });
                    }
                } else if ((n == 'insert' || n == 'merge') && v.map && v.push) {
                    for (let item of v) {
                        if (item._id) {
                            if (await collection.findOne({ _id: item._id })) {
                                if (n == 'merge') {
                                    await collection.updateOne({ _id: item._id }, { $set: item });
                                }
                                continue;
                            }
                        }
                        await collection.insertOne(item);
                    }
                } else {
                    throw `Unsupported ini operation: "${name}", "${n}"`;
                }
            }
        }

        await settings.updateOne({ _id: 'Show_Setup_Wizard' }, { $set: { "value": "completed" } });
	} catch (e) {
		console.error(e);
	} finally {
		if (client) {
			client.close();
		}
	}
};
export default init();