#!/bin/bash

docker build -t pippino_react_app .
docker stop pippino_react_app
docker rm pippino_react_app
docker run -d --restart always -p 3000:3000 --name pippino_react_app pippino_react_app
