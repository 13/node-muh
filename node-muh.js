const express = require('express');
const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const isReachable = require('is-reachable');
const wakeonlan = require('wake_on_lan');

const server_port = 8080;

var connectCounter = 0;

app.use(express.static(__dirname + '/public'));

io.on('connection', async (socket) => { 
  console.log('starting connection ...');
  connectCounter++; 
  console.log('users connected: ' + connectCounter);

  socket.on('disconnect', () => {
    connectCounter--;
    console.log('user disconnected: ' + connectCounter);
    clearAsyncInterval(interval);
  });

  socket.on('wakemac', (mac) => {
    console.log('Wake: ' + mac);
    if (mac != null){ 
      wakeonlan.wake(mac);
    }
  });

  var servero = { 'hosts' : [
			{ name:'google.com', port:'80'},
			{ name:'c3p1.muh', port:'22', mac:'40:8D:5C:1D:54:9B'},
			{ name:'jabba.muh', port:'22', mac:'90:1B:0E:3E:F3:77'},
			{ name:'p1.muh', port:'22'},
			{ name:'p3.muh', port:'22'},
			{ name:'p30.muh', port:'22'}
		]}
  
  for (x in servero){
	for (y in servero[x]){
	  servero[x][y].state = await isReachable(servero[x][y].name + ':' + servero[x][y].port);
	}
  }
  console.log('[WOL] Sending JSON ...');
  console.log('[WOL] JSON: ' + JSON.stringify(servero));
  socket.emit('wol',servero); // send
  
  /*var interval = setInterval(async() => {
	console.log('[WOL] Sending JSON Interval ...');
  	for (x in servero){
	  for (y in servero[x]){
	    servero[x][y].state = await isReachable(servero[x][y].name + ':' + servero[x][y].port);
	  }
	}
	console.log('[WOL] JSON: ' + JSON.stringify(servero));
	socket.emit('wol',servero); // send
  },5000);*/
  
  var interval = setAsyncInterval(async () => {
    console.log('start');
	console.log('[WOL] Sending JSON Interval ...');
  	for (x in servero){
	  for (y in servero[x]){
	    servero[x][y].state = await isReachable(servero[x][y].name + ':' + servero[x][y].port);
	  }
	}	
    const promise = new Promise((resolve) => {
      setTimeout(resolve('all done'), 3000);
    });
    await promise;
	console.log('[WOL] JSON: ' + JSON.stringify(servero));
	socket.emit('wol',servero); // send	
    console.log('end');
  }, 3000);
  
  
});

app.get('/', function (req, res) {
  res.send('Hello World!');
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

