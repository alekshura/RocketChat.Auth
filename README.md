# RocketChat Authorization module


```docker
docker-compose -f docker-rocketchat.yml up -d mongo
docker-compose -f docker-rocketchat.yml up -d mongo-init-replica
docker-compose -f docker-rocketchat.yml up -d rocketchat
docker-compose -f docker-rocketchat.yml up -d --build auth-service

```

Rocketchat -> Administracja -> Konta -> Iframe:
 - Iframe: https://your-system-domain.com/auth-service/rocketchat/login
 - API: https://your-system-domain.com/auth-service/rocketchat/auth
 - API mverb: POST

Po zalogowaniu się na https://local.zpwd.pl wchodzimy na adres https://local.zpwd.pl/rocketchat
