export function insert (env) {
    return [
        {
            "_id": "admin",
            "_updatedAt": new Date(),
            "description": "Admin",
            "mandatory2fa": false,
            "name": env.ROCKETCHAT_ADMIN,
            "scope": "Users"
        }
    ]
}