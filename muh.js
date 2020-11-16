const express = require('express');
const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);
const portal = io.of('/portal');
const wol = io.of('/wol');

const Gpio = require('onoff').Gpio;

const isReachable = require('is-reachable');
const wakeonlan = require('wake_on_lan');

const server_port = 8080;

var connectCounter = 0;

var LED = new Gpio(24, 'out'); // LED Haustür
let stopBlinking = false;

var portals = { 'portals' : [
			{ id:4, pin:25, 
			  name:"housedoor", name_short:"hd", name_long:"Haustür", 
			  state:0, tstamp:"2020-05-25 08:55:47" },
			{ id:5, pin:8, pin_lock:16, pin_unlock:20, pin_hold: 500,
			  name:"housedoorlock", name_short:"hdl", name_long:"Haustür Riegel",
			  state:0, tstamp:"2020-05-25 09:23:47" },
			{ id:2, pin:13, 
			  name:"garagedoor", name_short:"gd", name_long:"Garagentür", 
			  state:0, tstamp:"2020-05-25 07:10:47" },
			{ id:3, pin:6, pin_lock:19, pin_unlock:26, pin_hold: 500, led:false,
			  name:"garagedoorlock", name_short:"gdl", name_long:"Garagentür Riegel", 
			  state:0, tstamp:"2020-05-25 07:12:47" },	
			{ id:1, pin:5, pin_move:12, pin_hold: 400, led:false,
			  name:"garage", name_short:"g", name_long:"Garage", 
			  state:0, tstamp:"2020-05-24 07:50:47" }
		]} 

for (x in portals){
  for (y in portals[x]){
    //eval('portal' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin + ';');
    eval('portal' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin + ', \'in\', \'both\');');	
	if (portals[x][y].hasOwnProperty('pin_lock')){
	  //eval('lockRelay' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin_lock + ';');
	  eval('lockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_lock + ', \'high\', {activeLow:true});');
	}
	if (portals[x][y].hasOwnProperty('pin_unlock')){
	  //eval('unlockRelay' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin_unlock + ';');
	  eval('unlockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_unlock + ', \'high\', {activeLow:true});');
	}
	if (portals[x][y].hasOwnProperty('pin_move')){
	  //eval('moveRelay' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin_move + ';');
	  eval('moveRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_move + ', \'high\', {activeLow:true});');
	}
  }
}

portalHD.read((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'HD') ? x.id : null)[0].id;
  processPortal(id,value,true);
});
portalHDL.read((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'HDL') ? x.id : null)[0].id;
  processPortal(id,value,true);
});
portalGD.read((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'GD') ? x.id : null)[0].id;
  processPortal(id,value,true);
});
portalGDL.read((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].id;
  processPortal(id,value,true);
});
portalG.read((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].id;
  processPortal(id,value,true);
});

portalHD.watch((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'HD') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalHDL.watch((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'HDL') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalGD.watch((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'GD') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalGDL.watch((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalG.watch((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].id;
  processPortal(id,value);
});

const blinkLED = _ => {
  if (stopBlinking) {
    return 
  }
  LED.read()
    .then(value => LED.write(value^1))
    .then(_ => setTimeout(blinkLED, 1350))
    .catch(err => console.log('LED: ' + err));
};

function processPortal(id,state,initial=false){
  var pin = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].pin;
  var name = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name;
  var name_short = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_short.toUpperCase();
  var state_old = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state;

  if (initial == true){
    console.log(getTime() + ' Intializing ' + name_short + ' STATE: ' + state);
  } else {
    console.log(getTime() + ' ' + name_short + ' STATE: ' + state);
  }

  if (state_old != state){
    console.log(getTime() + ' Change ' + name_short + ' STATE: ' + state + ' STATE_OLD: ' + state_old);
    portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = state;
  }

  if (name_short == 'G'){ 
    if (state){
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].led = true;
    } else {
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].led = false;
    }
  }
  if (name_short == 'GDL'){ 
    if (state){
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].led = true;
    } else {
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].led = false;
    }
  }

  // LED blink
  if (name_short == 'G' || name_short == 'GDL'){ 
    if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].state == 1 &&
        portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].state == 1){
      // LED on
      console.log(getTime() + ' LED ON');
      stopBlinking = true;
      LED.write(1);
    } else if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].state == 1 ||
               portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].state == 1){
      // LED blink
      console.log(getTime() + ' LED BLINK');
      stopBlinking = false;
      blinkLED();
    } else {
      // LED off
      console.log(getTime() + ' LED OFF');
      stopBlinking = true;
      LED.write(0);
    }
  }
}

function setRelay(gpio,state) {
  if (state){
    gpio.write(1);
  } else {
    gpio.write(0);
  }
}

app.use(express.static(__dirname + '/public'));

function handlePortal(portal,name,action,hold){
  console.log(getTime() + ' ' + name + ' ' + action);
  setRelay(portal,true);
  setTimeout(function () {
    console.log(getTime() + ' ' + name + ' ' + action + ' OK');
    setRelay(portal,false);
  }, hold);  
}

portal.on('connection', async (socket) => {
  console.log('portal connected');
  connectCounter++; 
  console.log('users connected: ' + connectCounter);
  
  // disconnect user
  socket.on('disconnect', () => {
    connectCounter--;
    console.log('user disconnected: ' + connectCounter);
    clearAsyncInterval(interval_p);
  });

  // receive portal command
  socket.on('pushportal', (name, action) => {
    console.log('pushportal: ' + name + ' ' + action );
    if (name == 'housedoor'){
      if (action == 'lock'){ 
        handlePortal(lockRelayHDL,name,action,10);
      }
      if (action == 'unlock'){ 
        handlePortal(unlockRelayHDL,name,action,10);
      }
      if (action == 'open'){ 
        handlePortal(unlockRelayHDL,name,action,500);
      }
    }
    if (name == 'garagedoor'){
      if (action == 'lock'){ 
        handlePortal(lockRelayGDL,name,action,10);
      }
      if (action == 'unlock'){ 
        handlePortal(unlockRelayGDL,name,action,10);
      }
      if (action == 'open'){ 
        handlePortal(unlockRelayGDL,name,action,500);
      }
    }
    if (name == 'garage'){
      if (action == 'move'){ 
        handlePortal(moveRelayG,name,action,400);
      }
    }
  }); 	
	
  //console.log('[PORTAL] Sending JSON ...');
  //console.log('[PORTAL] JSON: ' + JSON.stringify(portals));
  portal.emit('portal',portals);
  
  // hosts interval ping and send
  var interval_p = setAsyncInterval(async () => {
    //console.log('start');
    //console.log('[PORTAL] Sending JSON Interval ...');
    const promise = new Promise((resolve) => {
      setTimeout(resolve('all done'), 3000);
    });
    await promise;
    //console.log('[PORTAL] JSON: ' + JSON.stringify(portals));
    portal.emit('portal',portals); // send	
    //console.log('end');
  }, 3000);   
  
});

wol.on('connection', async (socket) => {
  console.log('wol connected');
  connectCounter++; 
  console.log('users connected: ' + connectCounter);
    
  // disconnect user
  socket.on('disconnect', () => {
    connectCounter--;
    console.log('user disconnected: ' + connectCounter);
    clearAsyncInterval(interval);
  });

  // receive mac and wol
  socket.on('wakemac', (mac) => {
    console.log('Wake: ' + mac);
    if (mac != null){ 
      wakeonlan.wake(mac);
    }
  });  
  
  // hosts
  var hosts = { 'hosts' : [
			{ name:'google.com', port:'80'},
			{ name:'c3p1.muh', port:'22', mac:'40:8D:5C:1D:54:9B'},
			{ name:'jabba.muh', port:'22', mac:'90:1B:0E:3E:F3:77'},
			{ name:'samsungtv.muh', port:'22', mac:'90:1B:0E:3E:F3:77'},
			{ name:'p0.muh', port:'22'},
			{ name:'p4.muh', port:'22'},
			{ name:'p30.muh', port:'22'}
			//{ name:'fibert.muh', port:'80'},
			//{ name:'obiwan.muh', port:'80'},
			//{ name:'obiwan.muh', port:'80'},
			//{ name:'wr710.muh', port:'80'},
			//{ name:'esp32cam1.muh', port:'80'},
			//{ name:'esp32cam2.muh', port:'80'},
		]}
  
  // hosts ping and send 
  for (x in hosts){
	for (y in hosts[x]){
	  hosts[x][y].state = await isReachable(hosts[x][y].name + ':' + hosts[x][y].port);
	}
  }
  console.log('[WOL] Sending JSON ...');
  console.log('[WOL] JSON: ' + JSON.stringify(hosts));
  wol.emit('wol',hosts);
  
  // hosts interval ping and send
  var interval = setAsyncInterval(async () => {
    console.log('start');
    console.log('[WOL] Sending JSON Interval ...');
    for (x in hosts){
      for (y in hosts[x]){
        hosts[x][y].state = await isReachable(hosts[x][y].name + ':' + hosts[x][y].port);
      }
    }	
    const promise = new Promise((resolve) => {
      setTimeout(resolve('all done'), 3000);
    });
    await promise;
    console.log('[WOL] JSON: ' + JSON.stringify(hosts));
    wol.emit('wol',hosts); // send	
    console.log('end');
  }, 3000); 
  
});

// new connection
io.on('connection', async (socket) => { 
  var socketId = socket.id;
  var clientIp = socket.request.connection.remoteAddress;
  console.log('New connection ' + clientIp);
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/portal.html')
});

app.get('/portal', (req, res) => {
  res.sendFile(__dirname + '/public/portal.html')
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.get('/wol', (req, res) => {
  res.sendFile(__dirname + '/public/wol.html')
});

app.get('/wetter', (req, res) => {
  res.sendFile(__dirname + '/public/wetter.html')
});

server.listen(server_port, function () {
  console.log('Listening on port: ' + server_port);
});

// async intervals

const asyncIntervals = [];

const runAsyncInterval = async (cb, interval, intervalIndex) => {
  await cb();
  if (asyncIntervals[intervalIndex]) {
    setTimeout(() => runAsyncInterval(cb, interval, intervalIndex), interval);
  }
};

const setAsyncInterval = (cb, interval) => {
  if (cb && typeof cb === "function") {
    const intervalIndex = asyncIntervals.length;
    asyncIntervals.push(true);
    runAsyncInterval(cb, interval, intervalIndex);
    return intervalIndex;
  } else {
    throw new Error('Callback must be a function');
  }
};

const clearAsyncInterval = (intervalIndex) => {
  if (asyncIntervals[intervalIndex]) {
    asyncIntervals[intervalIndex] = false;
  }
};

// onoff unload 
function unexportOnClose() {
  LED.write(0);
  LED.unexport();
  portalHD.unexport();
  portalHDL.unexport();
  portalGD.unexport();
  portalGDL.unexport();
  portalG.unexport();  
  lockRelayHDL.unexport();
  unlockRelayHDL.unexport();
  lockRelayGDL.unexport();
  unlockRelayGDL.unexport();
  moveRelayG.unexport();
};
process.on('SIGINT', unexportOnClose); //function to run when user closes using ctrl+c 

function addZero(x,n) {
  while (x.toString().length < n) {
    x = "0" + x;
  }
  return x;
}
function getTime() {
  var d = new Date();
  var h = addZero(d.getHours(), 2);
  var m = addZero(d.getMinutes(), 2);
  var s = addZero(d.getSeconds(), 2);
  var ms = addZero(d.getMilliseconds(), 3);
  return (h + ":" + m + ":" + s + ":" + ms);
}

