# Pippino react app

## Getting started:

In the project dir, install node modules:

### `npm install`

Run the application in development mode:

### `npm start`

Build the application:

### `npm run build`

Serve:

### `npm install -g serve`
### `serve -s build`

## Docker container

A dockerfile is provided to deploy the containerized app (like on a raspberry pi).

Build image:

### `docker build -t pippino_react_app .`

Run:

### `docker run -it --rm -p 3000:3000 pippino_react_app`

