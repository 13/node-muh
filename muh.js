#!/usr/bin/env node

if (process.arch == 'arm'){
  envConfig = './env-p1'
} else {
  envConfig = './env'
}

// yargs
const argv = require('yargs')(process.argv.slice(2))
  // help text
  .alias('h', 'help')
  .help('help')
  .usage('Usage: $0 -t')
  .option('t', {
      alias : 'timestamp',
      describe: 'show timestamp',
      nargs: 0,
      //default: false,
      requiresArg: false
  }) .argv

// configuration
const showTimestamp = (argv.timestamp ? true : false)

const express = require('express')
const app = express()

const server = require('http').createServer(app)
const io = require('socket.io')(server)
const portal = io.of('/portal')
const wol = io.of('/wol')
const cam = io.of('/cams')

// influxdb 1.8+
const {InfluxDB, Point, HttpError, FluxTableMetaData} = require('@influxdata/influxdb-client')
const {url, org, token18, bucket, po_user, po_token} = require(envConfig)

// mqtt
const mqtt = require('mqtt')
const mqttClient  = mqtt.connect('mqtt://localhost')

// pigpio
const pigpio = process.env.NODE_ENV === 'dev' ?
  require('pigpio-mock') :
  require('pigpio')
const Gpio = pigpio.Gpio
// Level must be stable for xx ms
// 100 ok 150
var stableTime = 10 * 1000

const LED = new Gpio(24, {mode: Gpio.OUTPUT, alert: true}) //LED Haustür
var blinkIvLED = false
//const LedRun = require('ledrun')
//var LED = new LedRun(24)

// play-sound
const player = require('play-sound')(opts = {})

// loudness
const loudness = require('loudness')

// node-nodemailer
const nodemailer = require('nodemailer')
let transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/home/ben/bin/msmtp-enqueue.sh'
})
const {emailTo, emailFrom} = require(envConfig)

// node-pushover
const Push = require( 'pushover-notifications' )
const fs = require( 'fs' )
// image-download
const img_download = require('image-downloader')
var img_options = {
  url: 'http://192.168.22.101:8765/picture/3/current',
  dest: '/tmp/urlBell.jpg'
}

// wol
const isReachable = require('is-reachable')
const wakeonlan = require('wake_on_lan')

// helpers
const dayjs = require('dayjs');

// socketio
const server_port = 80
var connectCounter = 0

// timer
var lockTimer = false
var lockTimerMinutes = 15

// bell block timer
var bellLockTimer = false
var bellLockTimerSecs = 5

console.log(getTime() + 'portal: starting ...')

var os = { 'volume': { level:0, muted:false }, 
           'options': { alarm:true, sendmail:true, pushover:true }
         } 

// Show config
Object.entries(os).forEach(
  ([key, value]) => console.log(getTime() + 'config: ' + key, value)
)

setVolume(100)
getVolume().then( vol => { os.volume.level = vol })
getMuted().then( muted => { os.volume.muted = muted })

//hosts,menu,portals 
const {hosts} = require(envConfig)
const {menu} = require(envConfig)
const {portals} = require(envConfig)
const {cams} = require(envConfig)

for (x in portals){
  for (y in portals[x]){
    // Reed
    if (portals[x][y].hasOwnProperty('pin')){
      eval('in' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin + ', { mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, edge: Gpio.EITHER_EDGE, alert: true });')
      if (process.env.NODE_ENV !== 'dev'){
        // set stable time
        eval('in' + portals[x][y].name_short.toUpperCase() + '.glitchFilter(' + stableTime  + ')')
        // read first time
        processPortal(portals[x][y].id, eval('in' + portals[x][y].name_short.toUpperCase() + '.digitalRead()'),true)
        // run interrupt
        eval(`in${portals[x][y].name_short.toUpperCase()}.on('alert', (value, tick) => { \
          processPortal(portals.portals.filter(x => (x.name_short.toUpperCase() == '${portals[x][y].name_short.toUpperCase()}') ? x.id : null)[0].id,value) \
        })`)
      }
    }
    if (portals[x][y].hasOwnProperty('pin_lock')){
      eval('lockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_lock + ', {mode: Gpio.OUTPUT});');
    }
    if (portals[x][y].hasOwnProperty('pin_unlock')){
      eval('unlockRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_unlock + ', {mode: Gpio.OUTPUT});');
    }
    if (portals[x][y].hasOwnProperty('pin_move')){
      eval('moveRelay' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_move + ', {mode: Gpio.OUTPUT});');
    }
    // Button
    if (portals[x][y].hasOwnProperty('pin_button')){
      eval('in' + portals[x][y].name_short.toUpperCase() + ' = new Gpio(' + portals[x][y].pin_button + ', {mode: Gpio.INPUT, pullUpDown: Gpio.PUD_DOWN, edge: Gpio.RISING_EDGE, alert: true})');
      if (process.env.NODE_ENV !== 'dev'){
	// set stable time
        eval('in' + portals[x][y].name_short.toUpperCase() + '.glitchFilter(' + stableTime  + ')')
        // run interrupt
        eval(`in${portals[x][y].name_short.toUpperCase()}.on('alert', (value, tick) => { \
          processPortal(portals.portals.filter(x => (x.name_short.toUpperCase() == '${portals[x][y].name_short.toUpperCase()}') ? x.id : null)[0].id,value) \
        })`)
      }
    }
  }
}

function processPortal(id,state,initial=false){
  var pin = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].pin
  var name = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name
  var name_short = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_short.toUpperCase()
  var name_long = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_long
  var state_old = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state
  var state_name = portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state_name

  if (initial == true){
    console.log(getTime() + 'portal: intializing ' + name_short + ' STATE: ' + state);
    portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = state;

    // DEBUG
    //sendMail(name_long,(state ? state_name[0] : state_name[1]))
    //sendPushover(name_long,name_short)

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
    console.log(getTime() + 'portal: change detected ' + name_short + ' ' + state)

    if (typeof state_old !== 'undefined' && state != state_old){
      console.log(getTime() + 'portal: change ' + name_short + ' ' + state_old + ' -> ' + state)
      // check alarm
      checkAlarm(id)
      // save state
      portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = state
      // save datetime
      portals.portals.filter(x => (x.id == id) ? x.id : null)[0].tstamp = dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss')
      // write influxdb
      insertInfluxdb(name_short,state)
      // publish mqtt
      publishMQTT(name_short,JSON.stringify(portals.portals.filter(x => (x.id == id) ? x.id : null)[0]))
      // send mail
      sendMail(name_long,(state ? state_name[0] : state_name[1]))
    
      if (name_short == 'HD'){ 
        playSound(name_short, state)
      }		
    
      if (name_short == 'GD'){
        if (state){
          // set timer
          portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].lock_timer = true
          handleTimer('on')
        } else {
          // delete timer & disable autolock
          portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].lock_timer = false
	  handleTimer('off')
        }
	// play sound
	playSound(name_short, state) 
      }

      if (name_short == 'GDL'){
        if (state){
          // delete timer & disable autolock
          portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].lock_timer = false
  	  handleTimer('off')
        } else {
          // set timer
          portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].lock_timer = true
          handleTimer('on')
        }
      }
	
      if (name_short == 'G'){ 
        playSound(name_short, state)
      }
	  
      // bell
      if (name_short == 'B'){ 
        if (state){
          if (bellLockTimer == false){
            // increase volume & bell  
            setVolume(100)
            playSound('bell')
            setVolume(100)
            // pushover
            sendPushover(portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_long,name_short)
            // send mail
            sendMail(name_long,(state ? state_name[0] : state_name[1]))
            // reset bell
            portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state = 0 
            // timer
            console.log(getTime() + 'portal: bell timer started')
            bellLockTimer = true
            bellLockTimer = setTimeout(function() {
              console.log(getTime() + 'portal: bell timer finished')
              bellLockTimer = false
            }, bellLockTimerSecs*1000)
          }
        }
      }
    }
  }
    // LED
    if (name_short == 'G'){ 
      if (state){
        portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].led = true
      } else {
        portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].led = false
      }
    }
    if (name_short == 'GDL'){ 
      if (state){
        portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].led = true
      } else {
        portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].led = false
      }
    }

    // LED blink
    if (name_short == 'G' || name_short == 'GDL'){ 
      if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].state == 1 &&
          portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].state == 1){
        // LED on
        console.log(getTime() + 'portal: LED on')
        handleLED('on')
      } else if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].state == 1 ||
                 portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].state == 1){
        // LED blink
        console.log(getTime() + 'portal: LED blink')
        handleLED('blink')
      } else {
        // LED off
        console.log(getTime() + 'portal: LED off')
        handleLED('off')
      }
    }
}

app.use(express.static(__dirname + '/public'))

function handleLED(state){
  if (blinkIvLED != false){
    clearInterval(blinkIvLED)
    LED.digitalWrite(0)
    blinkIvLED = false
  }
  if (state == 'on'){
    LED.digitalWrite(1)
  }
  if (state == 'off'){
    LED.digitalWrite(0)
  }
  if (state == 'blink'){
    if (blinkIvLED == false){
      blinkIvLED = setInterval(function() {
        LED.digitalWrite(LED.digitalRead() ^ 1)
      }, 1350)
    }
  }
}

function handleTimer(state){
  if (state == 'on'){
    if (lockTimer == false){
      console.log(getTime() + 'portal: timer started')
      sendMail('AutoLock','STARTED ' + lockTimerMinutes + "m")
      lockTimer = setTimeout(function() {
        console.log(getTime() + 'portal: timer finished')
        lockTimer = false
        handlePortal(lockRelayGDL,'GDL','lock',10)
        sendMail('AutoLock','OK')
      }, lockTimerMinutes*60*1000)
    }
  }
  if (state == 'off'){
    if (lockTimer != false){
      console.log(getTime() + 'portal: timer cancelled')
      clearTimeout(lockTimer)
      lockTimer = false
      sendMail('AutoLock','CANCELLED')
    }
  }
}

function playSound(sound, state=false, ch='both'){
  // sounds folder
  var folder = '/home/ben/sounds/'
  
  // HD
  if (sound == 'HD'){
    if (state){
      if (dayjs().month() == 11 && dayjs().date() >= 24 && dayjs().date() <= 25){
        mp3 = 'door/chime6.mp3'
      } else {
	mp3 = 'door/elevator2.mp3'      
      }
    } else {
      if (dayjs().month() == 11 && dayjs().date() >= 24 && dayjs().date() <= 25){
        mp3 = 'door/otannenbaum.mp3'
      } else {
	mp3 = 'door/elevator1.mp3'
      }
    }
  }
	
  // GD
  if (sound == 'GD'){
    if (state){
      mp3 = 'door/gd-gtts-l-closed.mp3'    
    } else {
      mp3 = 'door/gd-gtts-l-opened.mp3'   
    }
  }
	
  // G
  if (sound == 'G'){
    if (state) {
      mp3 = 'garage/g-gtts-l-closed.mp3'
    } else {
      mp3 = 'garage/g-gtts-l-opened.mp3'
    }
  }
	
  // bell  
  if (sound == 'bell'){
    mp3 = 'bell/HausKlingel.mp3'
    if (dayjs().month() == 11 && dayjs().date() >= 24 && dayjs().date() <= 25){
      mp3 = 'bell/db-westminster1.mp3'
    }
  }  

  // RFID
  if (sound == 'rfid'){
    if (state == '1') {
      mp3 = 'door/rfid-allow.mp3'
    } else if (state == '0') {
      mp3 = 'door/rfid-deny.mp3'
    } else {
      mp3 = 'door/rfid-tosintercom.mp3'
    }
  }
	
  // play sound
  console.log(getTime() + 'portal: playing ' + folder.concat(mp3))
  player.play(folder.concat(mp3), function(err){ if (err) throw err })  
}

function setRelay(gpio,state) {
  if (state){
    gpio.digitalWrite(!true)
  } else {
    gpio.digitalWrite(!false)
  }
}

function handlePortal(portal,name,action,hold){
  setRelay(portal,true)
  setTimeout(function () {
    console.log(getTime() + 'portal: ' + name + ' ' + action + ' ')
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
  })

  // receive volume command
  socket.on('volume', (name, action) => {
    console.log(getTime() + 'socketio: volume ' + name + ' ' + action)
    if (name == 'toggle'){
      getMuted().then( muted => {
        if (muted){
          setMuted(false)
        } else {
          setMuted(true)
        }
      })
    }
  })
	
  // receive portal command
  socket.on('pushportal', (name, action) => {
    console.log(getTime() + 'socketio: pushportal ' + name + ' ' + action)
    if (name == 'HD'){
      if (action == 'lock'){ 
        handlePortal(lockRelayHDL,name,action,10)
      }
      if (action == 'unlock'){ 
        handlePortal(unlockRelayHDL,name,action,10)
      }
      if (action == 'open'){ 
        handlePortal(unlockRelayHDL,name,action,500)
      }
    }
    if (name == 'GD'){
      if (action == 'lock'){ 
        handlePortal(lockRelayGDL,name,action,10)
      }
      if (action == 'unlock'){ 
        handlePortal(unlockRelayGDL,name,action,10)
      }
      if (action == 'open'){ 
        handlePortal(unlockRelayGDL,name,action,500)
      }
    }
    if (name == 'G'){
      if (action == 'move'){ 
        handlePortal(moveRelayG,name,action,400)
      }
    }
  })
	
  // Send JSON 
  //console.log(getTime() + 'portal: Sending portal JSON ' + JSON.stringify(Object.assign({}, menu, portals)))
  //portal.emit('portal',(Object.assign({}, menu, portals)))
  console.log(getTime() + 'portal: Sending portal JSON ' + JSON.stringify(Object.assign({}, os, menu, portals)))
  portal.emit('portal',(Object.assign({}, os, menu, portals)))
	
  // hosts interval ping and send
  var interval_p = setAsyncInterval(async () => {
    const promise = new Promise((resolve) => {
      setTimeout(resolve('all done'), 3000)
    })
    await promise
      //console.log(getTime() + 'portal: Sending portal JSON interval ' + JSON.stringify(Object.assign({}, menu, portals)))
      portal.emit('portal',(Object.assign({}, os, menu, portals)))	
  }, 3000) 
  
})

wol.on('connection', async (socket) => {
  console.log(getTime() + 'socketio: wol connected')
  connectCounter++
  console.log(getTime() + 'socketio: users connected ' + connectCounter)
    
  // disconnect user
  socket.on('disconnect', () => {
    connectCounter--
    console.log(getTime() + 'socketio: users disconnected ' + connectCounter)
    clearAsyncInterval(interval)
  })

  // receive mac and wol
  socket.on('wakemac', (mac) => {
    console.log('Wake: ' + mac)
    console.log(getTime() + 'wakeonlan: waking ' + mac)
    if (mac != null){ 
      wakeonlan.wake(mac)
    }
  })  
  
  // hosts ping and send 
  for (x in hosts){
    for (y in hosts[x]){
      hosts[x][y].state = await isReachable(hosts[x][y].name + ':' + hosts[x][y].port)
    }
  }
  
  console.log(getTime() + 'portal: Sending wol JSON ' + JSON.stringify(Object.assign({}, menu, hosts)))
  wol.emit('wol',(Object.assign({}, menu, hosts)))	
  
  // hosts interval ping and send
  var interval = setAsyncInterval(async () => {
    for (x in hosts){
      for (y in hosts[x]){
	if (hosts[x][y].hasOwnProperty('ip')){
	  hosts[x][y].state = await isReachable(hosts[x][y].ip + ':' + hosts[x][y].port)	
	} else {
	  hosts[x][y].state = await isReachable(hosts[x][y].name + ':' + hosts[x][y].port)
	}
      }
    }	
    const promise = new Promise((resolve) => {
      setTimeout(resolve('all done'), 3000)
    })
    await promise
    //console.log(getTime() + 'portal: Sending wol JSON interval ' + JSON.stringify(Object.assign({}, menu, hosts)))
    wol.emit('wol',(Object.assign({}, menu, hosts)))
  }, 3000)
  
});

cam.on('connection', async (socket) => {
  console.log(getTime() + 'socketio: cam connected')
  connectCounter++
  console.log(getTime() + 'socketio: users connected ' + connectCounter)
    
  // disconnect user
  socket.on('disconnect', () => {
    connectCounter--
    console.log(getTime() + 'socketio: users disconnected ' + connectCounter)
    clearAsyncInterval(interval)
  })

  console.log(getTime() + 'portal: Sending cam JSON ' + JSON.stringify(Object.assign({}, menu, cams)))
  cam.emit('cams',(Object.assign({}, menu, cams)))	
  
  // hosts interval ping and send
  var interval = setAsyncInterval(async () => {
    //console.log(getTime() + 'portal: Sending cams JSON interval ' + JSON.stringify(Object.assign({}, menu, hosts)))
    cam.emit('cams',(Object.assign({}, menu, cams)))
  }, 3000)

});

// new connection
io.on('connection', async (socket) => { 
  var socketId = socket.id
  var clientIp = socket.request.connection.remoteAddress
  console.log(getTime() + 'socketio: new connection ' + clientIp)
})

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/portal.html')
})

app.get('/portal', (req, res) => {
  res.sendFile(__dirname + '/public/portal.html')
})

app.get('/ping', (req, res) => {
  res.send('pong');
})

app.get('/wol', (req, res) => {
  res.sendFile(__dirname + '/public/wol.html')
})

app.get('/cams', (req, res) => {
  res.sendFile(__dirname + '/public/cams.html')
})

app.get('/wetter', (req, res) => {
  res.sendFile(__dirname + '/public/wetter.html')
})

server.listen(server_port, function () {
  console.log(getTime() + 'socketio: listening on port ' + server_port)
})

// async intervals
const asyncIntervals = []
const runAsyncInterval = async (cb, interval, intervalIndex) => {
  await cb()
  if (asyncIntervals[intervalIndex]) {
    setTimeout(() => runAsyncInterval(cb, interval, intervalIndex), interval)
  }
};

const setAsyncInterval = (cb, interval) => {
  if (cb && typeof cb === "function") {
    const intervalIndex = asyncIntervals.length
    asyncIntervals.push(true)
    runAsyncInterval(cb, interval, intervalIndex)
    return intervalIndex
  } else {
    throw new Error('Callback must be a function')
  }
}

const clearAsyncInterval = (intervalIndex) => {
  if (asyncIntervals[intervalIndex]) {
    asyncIntervals[intervalIndex] = false
  }
}

// pigpio unload 
function unexportOnClose() {
  LED.digitalWrite(0)
  lockRelayHDL.digitalWrite(!false)
  unlockRelayHDL.digitalWrite(!false)
  lockRelayGDL.digitalWrite(!false)
  unlockRelayGDL.digitalWrite(!false)
  moveRelayG.digitalWrite(!false)
  pigpio.terminate()
  process.exit()
};
process.on('SIGINT', unexportOnClose); //function to run when user closes using ctrl+c 

function getTime() {
  return (showTimestamp ? dayjs().format('HH:mm:ss.SSS ') : '')
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
      console.log('ERRX: ' + e)
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

mqttClient.on('connect', function (){
  mqttClient.subscribe('rfid/json', function (err) {
    console.log(getTime() + 'mqtt: subscribing rfid')
  })
})

mqttClient.on('message', function (topic, msg){
  console.log(getTime() + 'mqtt: receiving ' + msg.toString())
  let rfid = JSON.parse(msg)
  if (typeof rfid.tag !== 'undefined'){
    if (rfid.location == 'HDL'){
      if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'HD') ? x.id : null)[0].state){
        playSound('rfid', '1') 
        if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'HDL') ? x.id : null)[0].state){
          console.log(getTime() + 'mqtt: opening ' + rfid.location)
          handlePortal(unlockRelayHDL,rfid.location,'open',500)
          sendPushover('RFID ' + rfid.location + ' opening ' + rfid.tag,rfid.location)
          sendMail('RFID ' + rfid.location + ' opening',rfid.tag)
        } else {
          console.log(getTime() + 'mqtt: locking ' + rfid.location)
          handlePortal(lockRelayHDL,rfid.location,'lock',10)
          sendPushover('RFID ' + rfid.location + ' locking ' + rfid.tag,rfid.location)
          sendMail('RFID ' + rfid.location + ' locking',rfid.tag)
        }
      } else {
        playSound('rfid', '2') 
      }
    } else if (rfid.location == 'GDL'){
      if (portals.portals.filter(x => (x.name_short.toUpperCase() == 'GD') ? x.id : null)[0].state){
        playSound('rfid', '1') 
        console.log(getTime() + 'mqtt: opening ' + rfid.location)
        handlePortal(unlockRelayGDL,rfid.location,'open',500)
        sendPushover('RFID ' + rfid.location + ' opening ' + rfid.tag,rfid.location)
        sendMail('RFID ' + rfid.location + ' opening',rfid.tag)
      } else {
        playSound('rfid', '2') 
      }
    } else {
        console.log(getTime() + 'mqtt: key missing location')
    }
  } else {
    console.log(getTime() + 'mqtt: deny ' + rfid.key)
    playSound('rfid', '0') 
    sendPushover('RFID ' + rfid.location + ' DENIED',rfid.location)
    sendMail('RFID ' + rfid.location + ' DENIED',rfid.key)
  }
})

function publishMQTT(name_short, json){
  console.log(getTime() + 'mqtt: publish ' + name_short)
  mqttClient.publish('portal/' + name_short + '/json', json)
}

function sendMail(name,state,msg=null){
  if (os.options.sendmail){
    transporter.sendMail({
      from: emailFrom,
      to: emailTo,
      subject: name + ' ' + state + ' ' + dayjs(new Date()).format('HH:mm:ss DD.MM.YYYY'),
      text: ((msg == null) ? "" : msg) + '\n\nby node-muh.js'
    }, (err, info) => {
      console.log(getTime() + 'email: sent ' + name + ' ' + state)
    })
  } else {
      console.log(getTime() + 'email: disabled')
  }
}

function sendPushover(name_long,img=null){
  if (os.options.pushover){

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
      debug: true*/
    }

    if (img != null){
      if (img == 'B' || img == 'HD' || img == 'HDL'){
        img_options = {
          url: 'http://192.168.22.101:8765/picture/3/current',
          dest: '/tmp/url' + img + '.jpg'
        }
      }
      if (img == 'G' || img == 'GD' || img == 'GDL'){
        img_options = {
          url: 'http://192.168.22.101:8765/picture/4/current',
          dest: '/tmp/url' + img + '.jpg'
        }
      }
      // wait
      //await new Promise(resolve => setTimeout(resolve, 5000))
      // image download
      img_download.image(img_options)
        .then(({ filename }) => {
          console.log(getTime() + '' + name_long + ': image downloaded ' + filename)
	//non-blocking
        //fs.readFile(path, function(err, data) {
	  msg['file'] = filename
	  //console.log(msg)
          p.send(msg, function(err, result) {
	    //DEBUG
	    //console.log('error', err)
	    //console.log('result', result)
            if (err) {throw err}
            console.log(getTime() + 'pushover: sent with image')
          })
	})
	.catch((err) => console.error(err))
      //})
    } else {
      p.send(msg, function(err, result) {
        if (err) {throw err}
        console.log(getTime() + 'pushover: sent')
      })
    }
  } else {
    console.log(getTime() + 'pushover: disabled')
  }

}

function checkAlarm(id){
  // alarm, all doors closed and change
  if (!(portals.portals.filter(x => (x.name_short.toUpperCase() == 'B') ? x.id : null)[0].state) &&
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'HD') ? x.id : null)[0].state &&
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'HDL') ? x.id : null)[0].state &&
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'GD') ? x.id : null)[0].state &&
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'GDL') ? x.id : null)[0].state &&
      portals.portals.filter(x => (x.name_short.toUpperCase() == 'G') ? x.id : null)[0].state){
        if (os.options.alarm && portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_short.toUpperCase() != 'B'){
          console.log(getTime() + 'portal: red alert')
          sendPushover(portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_long + ' opened ALERT',
	               portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_short.toUpperCase())
	  //sendMail(portals.portals.filter(x => (x.id == id) ? x.id : null)[0].name_long + ' ', 
	  //         portals.portals.filter(x => (x.id == id) ? x.id : null)[0].state + ' ALERT')  
        }
  }
}

async function getMuted(){
  const mute = await loudness.getMuted()
  console.log(getTime() + 'volume: ' + (mute ? 'muted' : 'unmuted'))
  os.volume.muted = mute
  return mute
}

async function setMuted(mute){
  console.log(getTime() + 'volume: ' + (mute ? 'mute' : 'unmute'))
  os.volume.muted = mute
  if (mute){ 
    await loudness.setMuted(true)
  } else {
    await loudness.setMuted(false)
  }
}

async function getVolume(){
  const vol = await loudness.getVolume()
  console.log(getTime() + 'volume: ' + vol + '%')
  os.volume.level = vol
  return vol
}

async function setVolume(vol){
  console.log(getTime() + 'volume: set ' + vol + '%')
  os.volume.level = vol
  await loudness.setVolume(vol)
}

