const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const isReachable = require('is-reachable');
const wakeonlan = require('wake_on_lan');

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
			{ id:1, name:'google.de', port:'80', mac:'20:DE:20:DE:20:DE'},
			{ id:2, name:'google.it', port:'82', mac:'20:DE:20:DE:20:DE'},
			{ id:3, name:'google.com', port:'80', mac:'20:DE:20:DE:20:DE'},
			{ id:4, name:'google.com', port:'443', mac:'20:DE:20:DE:20:DE'},
			{ id:5, name:'c3p1.muh', port:'22', mac:'40:8D:5C:1D:54:9B'},
			{ id:6, name:'jabba.muh', port:'22', mac:'90:1B:0E:3E:F3:77'}
		]}
  
  for (x in servero){
	for (y in servero[x]){
	  servero[x][y].state = await isReachable(servero[x][y].name + ':' + servero[x][y].port);
	}
  }

  console.log('Sending ...');
  socket.emit('wol',servero); // send 
  socket.on('wol', async (data) => { //get light switch status from client
	for (x in servero){
	  console.log('Starting ...');
	  console.log('WOL: ' + servero[x]);
    }
  }); 

  var interval = setInterval(async() => {
	console.log('Interval ...');
  	for (x in servero){
	  for (y in servero[x]){
	    servero[x][y].state = await isReachable(servero[x][y].name + ':' + servero[x][y].port);
	  }
	}
	for (x in servero){
	  console.log('WOL: ' + JSON.stringify(servero[x]));
	}
	socket.emit('wol',servero); // send
  },5000);  
  
});

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.get('/online', (req, res) => {
  console.log(isReachable('google.com:443'));
  res.send('OK');
});

app.get('/wol', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
});

app.get('/wetter', (req, res) => {
  res.sendFile(__dirname + '/public/wetter.html')
});

server.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

