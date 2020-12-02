# node-muh

node muh unified homeautomation

## Contents

 * [Features](#features)
 * [Installation](#installation)
 * [Configuration](#configuration)
 * [Hardware](#hardware)
 * [Troubleshooting](#troubleshooting)
 * [Todo](#todo)

## Installation

Install the pigpio C library, clone git node-muh repository and install node-muh dependencies.

```bash
pacman -S git npm base-devel
yay -S pigpio-git

git clone https://github.com/13/node-muh.git

npm install
npm rebuild

sudo setcap 'cap_net_bind_service=+ep' $(which node) //allow port 80
node muh.js

export NODE_ENV=dev && node muh.js
$env:NODE_ENV='dev'
```

## Troubleshooting

## Todo

- [x] add reed sensors
- [x] add relays
- [x] add influxdb
- [x] add mqtt
- [ ] add mail (mstmp-queue)
- [x] add pushmessage (pushover)
- [x] add klingel
- [ ] add rfid

- [ ] add autolock timer
- [ ] clear buffer socket (problems!!!)
- [ ] add influxdb send timestamp || test what happens
- [ ] wol popup window
- [ ] sounds page with volume slider, mute button, ...
