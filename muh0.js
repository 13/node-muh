/* TODO 
- influxdb
- sound
- mail
- mqtt
- psql
*/

const express = require('express');
const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);
const portal = io.of('/portal');
const wol = io.of('/wol');

//const Gpio = require('onoff').Gpio;

const isReachable = require('is-reachable');
const wakeonlan = require('wake_on_lan');

const server_port = 8080;

var connectCounter = 0;

let stopBlinking = false;

//var LED = new Gpio(24, 'out'); // LED Haustür

var portals = { 'portals' : [
			{ id:4, pin:25, 
			  name:"housedoor", name_short:"hd", name_long:"Haustür", 
			  state:1, tstamp:"2020-05-25 08:55:47" },
			{ id:5, pin:8, pin_lock:16, pin_unlock:20, pin_hold: 500,
			  name:"housedoorlock", name_short:"hdl", name_long:"Haustür Riegel",
			  state:false, tstamp:"2020-05-25 09:23:47" },
			{ id:2, pin:13, 
			  name:"garagedoor", name_short:"gd", name_long:"Garagentür", 
			  state:1, tstamp:"2020-05-25 07:10:47" },
			{ id:3, pin:6, pin_lock:19, pin_unlock:26, pin_hold: 500, led:false,
			  name:"garagedoorlock", name_short:"gdl", name_long:"Garagentür Riegel", 
			  state:1, tstamp:"2020-05-25 07:12:47" },	
			{ id:1, pin:5, pin_move:12, pin_hold: 400, led:false,
			  name:"garage", name_short:"g", name_long:"Garage", 
			  state:false, tstamp:"2020-05-24 07:50:47" }
		]} 
		
console.log('INFO: id ' + portals.portals.filter(x => (x.id == 1) ? x.id : null)[0].id);
console.log('INFO: id ' + portals.portals.filter(x => (x.name == "garage") ? x.id : null)[0].id);
console.log('INFO: pin ' + portals.portals.filter(x => (x.name == "garage") ? x.id : null)[0].pin);
console.log('INFO: state ' + portals.portals.filter(x => (x.name == "garage") ? x.id : null)[0].state);
portals.portals.filter(x => (x.name == "garage") ? x.id : null)[0].state = 1;
console.log('INFO: state ' + portals.portals.filter(x => (x.name == "garage") ? x.id : null)[0].state);

for (x in portals){
  for (y in portals[x]){
	//eval('portal' + portals[x][y].id + ' = ' + portals[x][y].pin + ';');
	//eval('portal' + portals[x][y].id + ' = new Gpio(' + portals[x][y].pin + ', \'in\', \'both\');');
	eval('portal' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin + ';');
	//eval('portal' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin + ', \'in\', \'both\');');	
	if (portals[x][y].hasOwnProperty('pin_lock')){
	  eval('lockRelay' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin_lock + ';');
	  //eval('lockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_lock + ', \'out\');');
	}
	if (portals[x][y].hasOwnProperty('pin_unlock')){
	  eval('unlockRelay' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin_unlock + ';');
	  //eval('unlockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_unlock + ', \'out\');');
	}
	if (portals[x][y].hasOwnProperty('pin_move')){
	  eval('moveRelay' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin_move + ';');
	  //eval('moveRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_move + ', \'out\');');
	}
  }
}

/*
portalHDL.read((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'HDL') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalHDL.watch((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'HDL') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalG.read((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalG.watch((err, value) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].id;
  processPortal(id,value);
});
*/

/*
portal5.read((err, value) => {
  if (err) { throw err; }
  console.log('NAME: ' + arguments.callee.name);
  var id = portals.portals.filter(x => (x.id == 5) ? x.id : null)[0].id;
  //processPortal(id,value);
  console.log('[' + getTime() + '] STATE:' + value + ' P:' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].pin + ' N:' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name);
  console.log('INFO: id ' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].id);
  console.log('INFO: state ' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state);
  portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = value;
  console.log('INFO: state ' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state);
});
portal5.watch((err, value) => {
  if (err) { throw err; }
  console.log('NAME: ' + arguments.callee.name);
  var id = portals.portals.filter(x => (x.id == 5) ? x.id : null)[0].id;
  console.log('[' + getTime() + '] STATE:' + value + ' P:' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].pin + ' N:' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name);
  console.log('INFO: id ' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].id);
  console.log('INFO: state ' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state);
  portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = value;
  console.log('INFO: state ' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state);
  LED.writeSync(value);
});
*/

function processPortal(id,value){
  console.log('X[' + getTime() + '] STATE:' + value + ' P:' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].pin + ' N:' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name);
  console.log('XINFO: id ' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].id);
  console.log('XINFO: state ' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state);
  if (portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state != value){
    console.log('XINFO: old state ' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state);
    portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = value;
	console.log('XINFO: new state ' + portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state);
  }
  // doorlock specific
  if (portals.portals.filter(x => (x.id == id) ? x.id : null)[0].id == 5){
    LED.writeSync(value);
  }
  // LED
  if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].state == 1 &&
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].state == 1){
    // LED on
	stopBlinking = true;
	LED.writeSync(1);
  } else if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].state == 1 ||
             portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].state == 1){
	// LED blink
	blinkLED();
  } else {
	// LED off
	stopBlinking = true;
	LED.writeSync(0);
  }
}

const blinkLed = _ => {
  if (stopBlinking) {
    return LED.writeSync(0);
  }
  led.read()
    .then(value => LED.write(value ^ 1))
    .then(_ => setTimeout(blinkLed, 400))
    .catch(err => console.log('LED: ' + err));
};

function setRelay(gpio,state) {
  if (state == true){
	gpio.writeSync(1);
  } else {
	gpio.writeSync(0);
  }
}

app.use(express.static(__dirname + '/public'));

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
		  setRelay(lockRelayHDL,true);
		  setTimeout(function () {
		    setRelay(lockRelayHDL,false);
		  }, 100);  
		}
		if (action == 'unlock'){ 
		  setRelay(unlockRelayHDL,true);
		  setTimeout(function () {
		    setRelay(unlockRelayHDL,false);
		  }, 100);  
		}
		if (action == 'open'){ 
		  setRelay(unlockRelayHDL,true);
		  setTimeout(function () {
		    setRelay(unlockRelayHDL,false);
		  }, 500);  
		}
	}
	if (name == 'garage'){
		if (action == 'move'){ 
		  setRelay(moveRelayG,true);
		  setTimeout(function () {
		    setRelay(moveRelayG,false);
		  }, 400);  
		}
	}	
	/*if (name == 'garage'){
		if (action == 'move'){ 
			pin = 12;
			hold = 0.5;
			var garageRelay = new Gpio(12, 'out');
			setRelay(garageRelay,true);
			setTimeout(function () {
			  setRelay(garageRelay,false);
			  setTimeout(function () {
			    garageRelay.unexport();
			  }, 500);
			}, 500);
	*/
  }); 	
	
  console.log('[PORTAL] Sending JSON ...');
  console.log('[PORTAL] JSON: ' + JSON.stringify(portals));
  portal.emit('portal',portals);
  
  // hosts interval ping and send
  var interval_p = setAsyncInterval(async () => {
    console.log('start');
	console.log('[PORTAL] Sending JSON Interval ...');
    const promise = new Promise((resolve) => {
      setTimeout(resolve('all done'), 3000);
    });
    await promise;
    console.log('[PORTAL] JSON: ' + JSON.stringify(portals));
	portal.emit('portal',portals); // send	
    console.log('end');
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
/*
function unexportOnClose() {
  LED.writeSync(0);
  LED.unexport();
  //portal1.unexport();
  //portal2.unexport();
  //portal3.unexport();
  //portal4.unexport();
  //portal5.unexport();
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
*/

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

