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

var portals = { 'portals' : [
			{ id:'1', name:"garage", state:false, tstamp:"2020-05-24 07:50:47"},
			{ id:'2', name:"garagedoor", state:false, tstamp:"2020-05-25 07:10:47"},
			{ id:'3', name:"garagedoorlock", state:false, tstamp:"2020-05-25 07:12:47"},			
			{ id:'4', name:"housedoor", state:false, tstamp:"2020-05-25 08:55:47"},
			{ id:'5', name:"housedoorlock", state:false, tstamp:"2020-05-25 09:23:47"}
		]} 

var LED = new Gpio(24, 'out'); // LED Haustür

// PIN_NUM, STATE, PIN_NUM_INTERNAL, DESC
var reedSensors = {};
reedSensors["P1"] = [ 5, undefined, 1, "Garage"];             // G
reedSensors["P2"] = [13, undefined, 2, "Garage Tür"];         // GT
reedSensors["P3"] = [ 6, undefined, 3, "Garage Tür Riegel"];  // GTR
reedSensors["P4"] = [25, undefined, 4, "Haustür"];            // HT
reedSensors["P5"] = [ 8, undefined, 5, "Haustür Riegel"];     // HTR

for(var reedSensor in reedSensors) {
  eval('reedSensor' + reedSensors[reedSensor][2] + '= new Gpio(' + reedSensors[reedSensor][0] + ', \'in\', \'both\');');
}

reedSensor5.read((err, value) => { // Asynchronous read
  if (err) { throw err; }
  console.log('[' + getTime() + '] STATE:' + value + ' P:' + reedSensors["P5"][0] + ' N:' + reedSensors["P5"][3]);
  console.log(portals.portals[4].id);
  console.log(portals.portals[4].state);
  portals.portals[4].state = value;
  console.log(portals.portals[4].state);
  
});
reedSensor5.watch((err, value) => { 
  if (err) { throw err; }
  console.log('[' + getTime() + '] STATE:' + value + ' P:' + reedSensors["P5"][0] + ' N:' + reedSensors["P5"][3]);
  console.log(portals.portals[4].id);
  console.log(portals.portals[4].state);
  portals.portals[4].state = value;
  console.log(portals.portals[4].state);
  LED.writeSync(value); //turn LED on or off depending on the button state (0 or 1)
});

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
  /*socket.on('pushportal', (cmd) => {
    console.log('cmd: ' + cmd);
  });*/ 
 	
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

function unexportOnClose() { //function to run when exiting program
  LED.writeSync(0); // Turn LED off
  LED.unexport(); // Unexport LED GPIO to free resources
  reedSensor1.unexport(); // Unexport Button GPIO to free resources
  reedSensor2.unexport(); // Unexport Button GPIO to free resources
  reedSensor3.unexport(); // Unexport Button GPIO to free resources
  reedSensor4.unexport(); // Unexport Button GPIO to free resources
  reedSensor5.unexport(); // Unexport Button GPIO to free resources
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

