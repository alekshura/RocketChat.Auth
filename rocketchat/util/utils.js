import SHA256 from 'meteor-sha256';
import { hash as _hash } from 'bcrypt';
import Random from './random';
import { createHash } from 'crypto';

const rounds = parseInt(process.env.BCRYPT_PASSWORD_ROUND, 10);

export default { hashPassword, generatePersonalAccessToken, generateLoginToken }

async function hashPassword(password) {
    return await _hash(SHA256(password), rounds);
}

function generatePersonalAccessToken(token, name) {
    return {
        "hashedToken": hashLoginToken(token),
        "type": "personalAccessToken",
        "createdAt": new Date().toISOString(),
        "lastTokenPart": token.slice(-6),
        "name": name
    };
}

function generateLoginToken() {
    return Random.secret();
}

function hashLoginToken(token) {
    const hash = createHash('sha256');
    hash.update(token);
    return hash.digest('base64');
}
