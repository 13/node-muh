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

const Gpio = require('onoff').Gpio;

const isReachable = require('is-reachable');
const wakeonlan = require('wake_on_lan');

const server_port = 8080;

var connectCounter = 0;

let stopBlinking = false;

var LED = new Gpio(24, 'out'); // LED Haustür

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
		
/*console.log('INFO: id ' + portals.portals.filter(x => (x.id == 1) ? x.id : null)[0].id);
console.log('INFO: id ' + portals.portals.filter(x => (x.name == "garage") ? x.id : null)[0].id);
console.log('INFO: pin ' + portals.portals.filter(x => (x.name == "garage") ? x.id : null)[0].pin);
console.log('INFO: state ' + portals.portals.filter(x => (x.name == "garage") ? x.id : null)[0].state);
portals.portals.filter(x => (x.name == "garage") ? x.id : null)[0].state = 1;
console.log('INFO: state ' + portals.portals.filter(x => (x.name == "garage") ? x.id : null)[0].state);
*/

for (x in portals){
  for (y in portals[x]){
	//eval('portal' + portals[x][y].id + ' = ' + portals[x][y].pin + ';');
	//eval('portal' + portals[x][y].id + ' = new Gpio(' + portals[x][y].pin + ', \'in\', \'both\');');
	//eval('portal' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin + ';');
	//console.log(eval('portal' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin + ', \'in\', \'both\');'));
	console.log('portal' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin + ', \'in\', \'both\');');
	if (portals[x][y].hasOwnProperty('pin_lock')){
	  //eval('lockRelay' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin_lock + ';');
	  //console.log(eval('lockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_lock + ', \'low\');'));
	  console.log('lockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_lock + ', \'low\');');
	}
	if (portals[x][y].hasOwnProperty('pin_unlock')){
	  //eval('unlockRelay' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin_unlock + ';');
	  console.log('unlockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_unlock + ', \'low\');');
	}
	if (portals[x][y].hasOwnProperty('pin_move')){
	  //eval('moveRelay' + portals[x][y].name_short.toUpperCase() + ' = ' + portals[x][y].pin_move + ';');
	  console.log('moveRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_move + ', \'low\');');
	}
  }
}

LED.writeSync(0);
/*
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
*/

