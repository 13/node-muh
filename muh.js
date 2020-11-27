#!/usr/bin/env node

const express = require('express');
const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);
const portal = io.of('/portal');
const wol = io.of('/wol');

// influxdb 1.8
const {InfluxDB, Point, HttpError, FluxTableMetaData} = require('@influxdata/influxdb-client')
const {url, org, token18, bucket, po_user, po_token} = require('./env')
//const writeApi = new InfluxDB({url:url,token:token18}).getWriteApi(org, bucket, 'ns')
//const queryApi = new InfluxDB({url:url,token:token18}).getQueryApi(org)

// influxdb 2+
/*const {InfluxDB, Point, HttpError, FluxTableMetaData} = require('@influxdata/influxdb-client')
const {url, token, org, bucket} = require('./env')
const {hostname} = require('os')
const writeApi = new InfluxDB({url, token}).getWriteApi(org, bucket, 'ns')
//writeApi.useDefaultTags({location: hostname()})
const queryApi = new InfluxDB({url, token}).getQueryApi(org)*/

// nodemailer
/*const nodemailer = require('nodemailer')
const smtpTransport = require('nodemailer-smtp-transport')*/

// mqtt
const mqtt = require('mqtt')
const mqttClient  = mqtt.connect('mqtt://localhost')

// pigpio
const pigpio = require('pigpio');
const Gpio = pigpio.Gpio;
//const Gpio = require('pigpio').Gpio
const LED = new Gpio(24, {mode: Gpio.OUTPUT, alert: true}) //LED Haustür
var stopBlinking = false
var stableTime = 10000 

// play-sound
const player = require('play-sound')(opts = {})

// loudness
const loudness = require('loudness')

// node-pushover
const Push = require( 'pushover-notifications' )
var fs = require( 'fs' )

const isReachable = require('is-reachable');
const wakeonlan = require('wake_on_lan');

//const dayjs = require('dayjs/locale/de');
const dayjs = require('dayjs');

const server_port = 80;
var connectCounter = 0;
var timer = null;

console.log(getTime() + 'portal: starting ...');

/*var portals = { 'portals' : [
			{ id:4, pin:25, 
			  name:"housedoor", name_short:"hd", name_long:"Haustür", 
			  state:0, tstamp:dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss') },
			{ id:5, pin:8, pin_lock:16, pin_unlock:20, pin_hold: 500,
			  name:"housedoorlock", name_short:"hdl", name_long:"Haustür Riegel",
			  state:0, tstamp:dayjs('2020-11-16 09:30:00').format('YYYY-MM-DD HH:mm:ss') },
			{ id:2, pin:13, 
			  name:"garagedoor", name_short:"gd", name_long:"Garagentür", 
			  state:0, tstamp:"2020-05-25 07:10:47" },
			{ id:3, pin:6, pin_lock:19, pin_unlock:26, pin_hold: 500, led:false,
			  name:"garagedoorlock", name_short:"gdl", name_long:"Garagentür Riegel", 
			  state:0, tstamp:"2020-05-25 07:12:47" },	
			{ id:1, pin:5, pin_move:12, pin_hold: 400, led:false,
			  name:"garage", name_short:"g", name_long:"Garage", 
			  state:0, tstamp:"2020-05-24 07:50:47" }
		]}*/
var portals = { 'portals' : [
			{ id:4, pin:25, 
			  name:"housedoor", name_short:"hd", name_long:"Haustür" },
			{ id:5, pin:8, pin_lock:16, pin_unlock:20, pin_hold: 500, lock_timer: false,
			  name:"housedoorlock", name_short:"hdl", name_long:"Haustür Riegel" },
			{ id:2, pin:13, 
			  name:"garagedoor", name_short:"gd", name_long:"Garagentür" },
			{ id:3, pin:6, pin_lock:19, pin_unlock:26, pin_hold: 500, led:false,
			  name:"garagedoorlock", name_short:"gdl", name_long:"Garagentür Riegel" },
			{ id:1, pin:5, pin_move:12, pin_hold: 400, led:false,
			  name:"garage", name_short:"g", name_long:"Garage" },
			{ id:100, pin_button:7, state:0,
			  name:"bell", name_short:"b", name_long:"Klingel" }  
		]} 

for (x in portals){
  for (y in portals[x]){
    if (portals[x][y].hasOwnProperty('pin')){
      eval('portal' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin + ', { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, edge: Gpio.EITHER_EDGE, alert: true });')
      // read first time
      processPortal(portals[x][y].id, eval('portal' + portals[x][y].name_short.toUpperCase() + '.digitalRead()'),true)
      // set stable time
      eval('portal' + portals[x][y].name_short.toUpperCase() + '.glitchFilter(' + stableTime  + ')')
    }
    if (portals[x][y].hasOwnProperty('pin_lock')){
      eval('lockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_lock + ', {mode: Gpio.OUTPUT});');
      // set inital state to low
      //eval('lockRelay' + portals[x][y].name_short.toUpperCase() + '.digitalWrite(0)')
    }
    if (portals[x][y].hasOwnProperty('pin_unlock')){
      eval('unlockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_unlock + ', {mode: Gpio.OUTPUT});');
      // set inital state to low
      //eval('unlockRelay' + portals[x][y].name_short.toUpperCase() + '.digitalWrite(1)')
    }
    if (portals[x][y].hasOwnProperty('pin_move')){
      //eval('moveRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_move + ', {mode: Gpio.OUTPUT});');
      // set inital state to low
      //eval('moveRelay' + portals[x][y].name_short.toUpperCase() + '.digitalWrite(0)')
    }
    if (portals[x][y].hasOwnProperty('pin_button')){
      eval('button' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_button + ', {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, edge: Gpio.RISING_EDGE, alert: true})');
      // set stable time
      eval('button' + portals[x][y].name_short.toUpperCase() + '.glitchFilter(' + stableTime  + ')')
    }
  }
}

portalHD.on('alert', (value, tick) => {	
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'HD') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalHDL.on('alert', (value, tick) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'HDL') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalGD.on('alert', (value, tick) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'GD') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalGDL.on('alert', (value, tick) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].id;
  processPortal(id,value);
});
portalG.on('alert', (value, tick) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].id;
  processPortal(id,value);
});
// bell
buttonB.on('alert', (value, tick) => {
  var id = portals.portals.filter(x => (x.name_short.toUpperCase() == 'B') ? x.id : null)[0].id;
  processPortal(id,value);
});

/*const blinkLED = _ => {
  if (stopBlinking) {
    return 
  }
  LED.on('alert', (value, tick) => {
    .then(value => LED.digitalWrite(led.digitalRead()^1))
    .then(_ => setTimeout(blinkLED, 1350))
    .catch(err => console.log('LED: ' + err));
};*/

function processPortal(id,state,initial=false){
  var pin = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].pin;
  var name = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name;
  var name_short = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_short.toUpperCase();
  var state_old = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state;

  if (initial == true){
    console.log(getTime() + 'portal: intializing ' + name_short + ' STATE: ' + state);
    portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = state;

    // read influxdb & write if empty
    queryInfluxdb(id,name_short,state)
    // publish mqtt
    publishMQTT(name_short,JSON.stringify(portals.portals.filter(x => (x.id == id) ? x.id : null)[0]))
    //if (typeof lastTimestamp === 'undefined'){
    //if (typeof portals.portals.filter(x => (x.id == id) ? x.id : null)[0].tstamp === 'undefined'){
    //  console.log(getTime() + ' No last entry ' + name_short + ' STATE: ' + state + ' tstamp: ' + tstamp);
      //portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = state;

      //insertInfluxdb(name_short,state);
      //queryInfluxdb(id,name_short)
    //}
  } else {
    console.log(getTime() + 'portal: ' + name_short + ' ' + state);
  }

  if (typeof state_old !== 'undefined' && state != state_old){
    console.log(getTime() + 'portal: change ' + name_short + ' ' + state_old + ' -> ' + state);
    checkAlarm(id)
    portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = state;
    // save datetime
    portals.portals.filter(x => (x.id == id) ? x.id : null)[0].tstamp = dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss');
    // write influxdb
    insertInfluxdb(name_short,state);
    // publish mqtt
    publishMQTT(name_short,JSON.stringify(portals.portals.filter(x => (x.id == id) ? x.id : null)[0]))
    // send mail
    //sendMail(name_short,state)
	
    // play sound
    if (name_short == 'HD'){ 
      if (state){
         playSound('dong')
      } else {
         playSound('ding')
      }
    }	
	
    // automatic lock
    if (name_short == 'GD'){
      if (state){
        // set timer 10m
        portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].lock_timer = true;
        startTimer()
      } else {
        // delete timer & disable autolock
        portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].lock_timer = false;
	clearTimeout(timer);
      }
    }
    if (name_short == 'GDL'){
      if (state){
        // delete timer & disable autolock
        portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].lock_timer = false;
        clearTimeout(timer);
      } else {
        // set timer 10m
        portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].lock_timer = true;
        startTimer()
      }
    }
	
    // bell
    if (name_short == 'B'){ 
      if (state){
        loudness.setVolume(100)
        playSound('bell')
        loudness.setVolume(85)
        // pushover
        sendPushover(portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_long,'img')
        // reset bell
        portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = 0 
      }
    }
  }

  // LED
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
      console.log(getTime() + 'portal: LED on')
      stopBlinking = true;
      LED.digitalWrite(1);
    } else if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].state == 1 ||
               portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].state == 1){
      // LED blink
      console.log(getTime() + 'portal: LED blink')
      stopBlinking = false;
      blinkLED();
    } else {
      // LED off
      console.log(getTime() + 'portal: LED off')
      stopBlinking = true;
      LED.digitalWrite(0);
    }
  }
}

app.use(express.static(__dirname + '/public'));

function startTimer(){
  var timer = null;
  console.log(getTime() + 'portal: timer started')
  var timer = setTimeout(function () {
    console.log(getTime() + 'portal: timer finished')
    //handlePortal(lockRelayGDL,'garagedoorlock','lock',10)
  }, 5000)
}

function playSound(sound){
  var folder = '/home/ben/sounds/'
  if (sound == 'ding'){
    mp3 = 'door/elevator1.mp3'
    if (dayjs().month() == 12 && dayjs().date() >= 23 && dayjs().date() <= 26){
      mp3 = 'door/otannenbaum.mp3'
    }
  }
  if (sound == 'dong'){
    mp3 = 'door/elevator2.mp3'
    if (dayjs().month() == 12 && dayjs().date() >= 23 && dayjs().date() <= 26){
      mp3 = 'door/chime6.mp3'
    }
  }
  // bell  
  if (sound == 'bell'){
    mp3 = 'bell/HausKlingel.mp3'
    if (dayjs().month() == 12 && dayjs().date() >= 23 && dayjs().date() <= 26){
      mp3 = 'bell/db-westminster1.mp3'
    }
  }  
  console.log(getTime() + 'portal: playing ' + folder.concat(mp3))
  player.play(folder.concat(mp3), function(err){
    if (err) throw err
  })
}

function setRelay(gpio,state) {
  if (state){
    gpio.digitalWrite(0) //haha
  } else {
    gpio.digitalWrite(0)
  }
}

function handlePortal(portal,name,action,hold){
  console.log(getTime() + 'portal: ' + name + ' ' + action);
  setRelay(portal,true)
  setTimeout(function () {
    console.log(getTime() + 'portal: ' + name + ' ' + action + ' OK')
    setRelay(portal,false)
  }, hold)
}

portal.on('connection', async (socket) => {
  console.log(getTime() + 'socketio: portal connected')
  connectCounter++; 
  console.log(getTime() + 'socketio: users connected ' + connectCounter)
  
  // disconnect user
  socket.on('disconnect', () => {
    connectCounter--;
    console.log(getTime() + 'socketio: users disconnected ' + connectCounter)
    clearAsyncInterval(interval_p);
  });

  // receive portal command
  socket.on('pushportal', (name, action) => {
    console.log(getTime() + 'socketio: pushportal ' + name + ' ' + action)
    if (name == 'housedoor'){
      if (action == 'lock'){ 
        handlePortal(lockRelayHDL,name,action,50)
      }
      if (action == 'unlock'){ 
        handlePortal(unlockRelayHDL,name,action,50)
      }
      if (action == 'open'){ 
        handlePortal(unlockRelayHDL,name,action,500)
      }
    }
    if (name == 'garagedoor'){
      if (action == 'lock'){ 
        handlePortal(lockRelayGDL,name,action,100)
      }
      if (action == 'unlock'){ 
        handlePortal(unlockRelayGDL,name,action,100)
      }
      if (action == 'open'){ 
        handlePortal(unlockRelayGDL,name,action,500)
      }
    }
    if (name == 'garage'){
      if (action == 'move'){ 
        handlePortal(moveRelayG,name,action,400)
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
  console.log(getTime() + 'socketio: new connection ' + clientIp)
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

app.get('/cams', (req, res) => {
  res.sendFile(__dirname + '/public/cams.html')
});

app.get('/wetter', (req, res) => {
  res.sendFile(__dirname + '/public/wetter.html')
});

server.listen(server_port, function () {
  console.log(getTime() + 'socketio: listening on port ' + server_port)
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
  LED.digitalWrite(0);
  lockRelayHDL.digitalWrite(0);
  unlockRelayHDL.digitalWrite(0);
  lockRelayGDL.digitalWrite(0);
  unlockRelayGDL.digitalWrite(0);
  pigpio.terminate();
  /*LED.unexport();
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
  buttonB.unexport();*/
  process.exit();
};
process.on('SIGINT', unexportOnClose); //function to run when user closes using ctrl+c 

function getTime() {
  return dayjs().format('HH:mm:ss.SSS ')
}

// influxdb writeapi
function insertInfluxdb(portal, state){
  const writeApi = new InfluxDB({url:url,token:token18}).getWriteApi(org, bucket, 'ns')
  const point = new Point('portal')
    .tag('portal_name', portal)
    .floatField('state', state)
  writeApi.writePoint(point)
  writeApi
    .close()
    .then(() => {
      console.log(getTime() + 'influxdb: write ' + point)
    })
    .catch(e => {
       console.error(e)
       if (e instanceof HttpError && e.statusCode === 401) {
         console.log('ERR1: ' + e)
       }	
       console.log('ERR2: ' + e)
    })	
}

function queryInfluxdb(id, name_short, state){
  const fluxQuery = `from(bucket:"homeautomation") 
                 |> range(start: 0) 
		 |> filter(fn: (r) => r["_measurement"] == "portal")
                 |> filter(fn: (r) => r["portal_name"] == "${name_short}")
                 |> filter(fn: (r) => r["_field"] == "state")
		 |> sort(columns:["_time"], desc: true)
                 |> limit(n:1)`;

  const queryApi = new InfluxDB({url:url,token:token18}).getQueryApi(org)
  queryApi.queryRows(fluxQuery, {
    next(row, tableMeta) {
      const o = tableMeta.toObject(row)
      //console.log(JSON.stringify(o, null, 2))
      //console.log(`${o._time} ${o._measurement} ${o.portal_name} ${o._field}=${o._value}`)
      time = o._time;
    },
    error(e) {
      console.error(e)
      console.log('ERR: ' + e)
    },
    complete() {
      if (typeof time === 'undefined'){
        console.log(getTime() + 'influxdb: no record found for ' + name_short)
        insertInfluxdb(name_short,state);
        portals.portals.filter(x => (x.id == id) ? x.id : null)[0].tstamp = dayjs().format('YYYY-MM-DD HH:mm:ss')
      } else {
        console.log(getTime() + 'influxdb: read ' + name_short + ' ' + time)
        portals.portals.filter(x => (x.id == id) ? x.id : null)[0].tstamp = dayjs(time).format('YYYY-MM-DD HH:mm:ss')
      }
    },
  })
}

function publishMQTT(name_short, json){
  //mqttClient.on('connected',function(){
  console.log(getTime() + 'mqtt: publish ' + name_short)
  mqttClient.publish('portal/' + name_short + '/json', json)
  //})
  //mqttClient.end()
}

/*var transporter = nodemailer.createTransport(smtpTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  auth: {
      user: '@gmail.com',
      pass: ''
  }
}));

function sendMail(name,state){
  var mailOptions = {
    from: 'gmail.com',
    to: '@gmail.com',
    subject: name + ' ' + state + ' ' + dayjs().format('HH:mm:ss.SSS DD.MM.YYYY'),
    text: 'from: p4'
  };
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(getTime() + 'nodemailer: error ' + error)
    } else {
      console.log(getTime() + 'nodemailer: sent ' + info.response)
    }
  });  
}*/

function sendPushover(name_long,image){
/*fs.readFile('/home/ben/test.png', function(err, data) {*/
  var p = new Push({
    user: po_user,
    token: po_token
  })
  var msg = {
    message: dayjs(new Date()).format('HH:mm:ss DD.MM.YYYY'),
    title: name_long,
    sound: 'magic',
    device: 'p1',
    priority: 1/*,
    file: { name: 'test.png', data: data }*/
  }
  p.send(msg, function(err, result) {
    if (err) {throw err}
    console.log(getTime() + 'pushover: sent')
  })
/*})*/

}

function checkAlarm(id){
  // alarm
  // all doors closed and change
  if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'HD') ? x.id : null)[0].state &&
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'HDL') ? x.id : null)[0].state &&
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'GD') ? x.id : null)[0].state &&
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].state &&
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].state){
        sendPushover(portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_long,'img')
  }
}

