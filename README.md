# node-muh
node muh unified homeautomation

## Installation
```bash
  pacman -S git npm

  git clone https://github.com/13/node-muh.git

  npm install --save
  npm rebuild

  sudo setcap 'cap_net_bind_service=+ep' $(which node) //allow port 80

  node muh.js
```

## TODO
### Main features
- [x] add reed sensors
- [x] add relays
- [x] add influxdb
- [ ] add mqtt
- [ ] add mail (gmail)
- [ ] add pushmessage (gotify)
- [ ] add klingel
- [ ] add rfid

### Secondary features
- [ ] add autolock timer
- [ ] clear buffer socket
- [ ] add influxdb send timestamp || test what happens
- [ ] wol popup window
- [ ] sounds page with volume slider, mute button, ...
