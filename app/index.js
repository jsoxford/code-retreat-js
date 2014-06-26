var net = require('net');

var team = [
  {"name": "Ryan Brooks"},
  {"name": "Ben Foxall"}
];
var sessionId = 0;

var localPort = 7878;
var remoteAddress = '127.0.0.1';
var remotePort = 8787;

// Set up listener for messages
var server = net.createServer(function(socket) {
  socket.setEncoding('utf8')

  socket.on('data', function (payload) {
    var payloadObj;
    var response = {success: true}; // assume success :)

    try{
        payloadObj = JSON.parse(payload);
    }catch(e){
        payloadObj = {}; // We'll just use an empty payloadObj
    }

    switch(payloadObj.action){
      case "processIteration":
        var gen0 = payloadObj.payload.generation0;
        response.payload = {
          generation0: gen0,
          generation1: processIteration(gen0)
        }
        break;
      case "getClientInfo":
        response.payload = {
          "team": team,
          "session": sessionId,
          "language": "javascript",
        };
        break;
      default:
        response = {
          success: false,
          message: "I don't understand the action requested in "+payload
        };
    }
    response.respondingTo = payloadObj.action;
    socket.write(JSON.stringify(response));
  });
});



server.listen(localPort);

// Connect to the remote server and send capabilities
var client = new net.Socket();
client.connect(remotePort, remoteAddress, function() {
	console.log('Connected');
  var payload = {
    address: server.address().address,
    port: localPort,
    language: 'javascript'
  }
	client.write(JSON.stringify(payload));
});

// Receive requests from the server
client.on('data', function(data) {
	console.log('Received: ' + data);
});

// Handle the server closing the connection
client.on('close', function() {
	console.log('Connection closed');
});

function processIteration(generation0){
  return "000100100111101011101011010101";
}
