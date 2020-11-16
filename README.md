# node-muh
node muh unified homeautomation

## Installation
```bash
  pacman -S git npm

  git clone https://github.com/13/node-muh.git

  npm install --save
  npm rebuild

  sudo setcap 'cap_net_bind_service=+ep' $(which node) // allow port 80

  node muh.js
```

## TODO
* send mqtt message
