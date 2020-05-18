const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const isReachable = require('is-reachable');
const wakeonlan = require('wake_on_lan');

const server_port = 8080;

var connectCounter = 0;

io.on('connection', async (socket) => { 
  console.log('starting connection ...');
  connectCounter++; 
  console.log('user connected ' + connectCounter);
  socket.on('connect', () => {
	connectCounter++;  
    console.log('user connected ' + connectCounter);
  });
  socket.on('disconnect', () => {
    connectCounter--;
    console.log('user disconnected ' + connectCounter);
    if (connectCounter < 1){
      clearInterval(interval);
    }
  });

  socket.on('wakemac', (mac) => {
    console.log('Wake: ' + mac);
    wakeonlan.wake(mac);
  });

  var servero = { 'hosts' : [
			{ name:'google.com', port:'80', mac:'20:DE:20:DE:20:DE'},
			{ name:'c3p1.muh', port:'22', mac:'40:8D:5C:1D:54:9B'},
			{ name:'jabba.muh', port:'22', mac:'90:1B:0E:3E:F3:77'},
			{ name:'p1.muh', port:'22', mac:'40:8D:5C:1D:54:9B'},
			{ name:'p3.muh', port:'22', mac:'00:11:22:33:44:55'},
			{ name:'p30.muh', port:'22', mac:'00:11:22:33:44:55'}
		]}
  
  for (x in servero){
	for (y in servero[x]){
	  servero[x][y].state = await isReachable(servero[x][y].name + ':' + servero[x][y].port);
	}
  }
  console.log('[WOL] Sending JSON ...');
  console.log('[WOL] JSON: ' + JSON.stringify(servero));
  socket.emit('wol',servero); // send
  
  /*socket.on('wol', async (data) => { //get light switch status from client
	for (x in servero){
	  console.log('Starting ...');
	  console.log('WOL: ' + servero[x]);
    }
  });*/

  var interval = setInterval(async() => {
	console.log('[WOL] Sending JSON Interval ...');
  	for (x in servero){
	  for (y in servero[x]){
	    servero[x][y].state = await isReachable(servero[x][y].name + ':' + servero[x][y].port);
	  }
	}
	console.log('[WOL] JSON: ' + JSON.stringify(servero));
	socket.emit('wol',servero); // send
  },5000);  
  
});

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.get('/wol', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
});

app.get('/wetter', (req, res) => {
  res.sendFile(__dirname + '/public/wetter.html')
});

server.listen(server_port, function () {
  console.log('Listening on port: ' + server_port);
});

