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

### Prequesites

Install the pigpio C library.

```bash
pacman -S base-devel git npm
yay -S pigpio-git
```

### Installation

Clone git node-muh repository, install node-muh dependencies and run.
 
```bash
git clone https://github.com/13/node-muh.git

npm install

sudo node muh.js
```

Or run with development environment

```bash
export NODE_ENV=dev && sudo node muh.js
```

## Troubleshooting

### Allow port 80 on linux

```bash
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

### Set env on powershell

```bash
$env:NODE_ENV='dev'
```

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
