import { hashPassword, generatePersonalAccessToken } from '../util/utils';

export async function merge (env) {
    const botPasswordHash = await hashPassword(process.env.ROCKETCHAT_BOT_PASSWORD);

    return [
        {
            _id: "rocket.cat",
            "_updatedAt": new Date(),
            "services": {
                "password": {
                    "bcrypt": botPasswordHash,
                },
                "resume": {
                    "loginTokens": []
                }
            },
            "username": "rocket.cat",
            "requirePasswordChange": false,
            "roles": [
                "bot",
                "admin"
            ]
        }
    ]
}

export async function insert (env) {
    const adminPasswordHash = await hashPassword(process.env.ROCKETCHAT_ADMIN_PASSWORD);
    const rcSuPat = generatePersonalAccessToken(process.env.ROCKETCHAT_SU_PAT_TOKEN, 'PAT');

    return [
        {
            "_id": `${env.ROCKETCHAT_SU_ID}`,
            "createdAt": new Date(),
            "services": {
                "resume": {
                    "loginTokens": [
                        rcSuPat
                    ]
                }
            },
            "emails": [
                {
                    "address": `rc.su@${env.ROCKETCHAT_DEFAULT_EMAIL_DOMAIN}`,
                    "verified": true
                }
            ],
            "type": "bot",
            "status": "offline",
            "active": true,
            "_updatedAt": new Date(),
            "roles": [
                "admin",
                "user-generate-access-token",
                "create-personal-access-tokens"
            ],
            "name": "Special user",
            "statusConnection": "offline",
            "username": "rc.su",
            "utcOffset": 1,
        },
        {
            "_id": "admin",
            "createdAt": new Date(),
            "services": {
                "password": {
                    "bcrypt": adminPasswordHash,
                }
            },
            "emails": [
                {
                    "address": env.ROCKETCHAT_ADMIN_EMAIL,
                    "verified": true
                }
            ],
            "requirePasswordChange": true,
            "type": "user",
            "status": "offline",
            "active": true,
            "_updatedAt": new Date(),
            "roles": [
                "admin"
            ],
            "name": "Administrator",
            "lastLogin": new Date(),
            "statusConnection": "offline",
            "username": "admin",
            "utcOffset": 1,
            "settings": {
                "preferences": {
                    "sidebarViewMode": "extended"
                }
            }
        }
    ]
}