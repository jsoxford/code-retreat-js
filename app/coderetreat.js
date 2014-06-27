#! /usr/bin/env node
var net = require('net');
var fs = require('fs');

var fileToWatch;

if(process.argv[0] == 'node' && process.argv.length == 3){
    fileToWatch = process.argv[2];
}else if(process.argv.length == 2){
    fileToWatch = process.argv[1];
}
console.log("Watching " + fileToWatch);

/**
 TODO

 * Die on disconnection from server?
 * Watch file reloads too many times
 * Run test suite
 * Post results to server
 * Status page -> local page to see red/green/refactor cycle
 **/



var remoteAddress = '127.0.0.1';
var remotePort = 8787;
var session; // The loaded Javascript object (or undefined)

try{
  session = require(fileToWatch);
}catch(e){
  console.error("Something went pretty badly wrong. Does that file exist? "+fileToWatch);
  process.exit(1);
}

// Connect to the remote server and send capabilities
var client = new net.Socket();
try{
    client.connect(remotePort, remoteAddress, function() {
        console.log('Connected');
    });
}catch(e){
    // FIXME should we silently accept failure and do the test runs anyway?
    console.error("Could not connect to server, are you connected to the network?");
    process.exit(1);
}

// Watch the file for changes and run the test suite when it does
fs.watch(fileToWatch, function (event, filename) {
  if(event == 'change'){
    console.log("Noticed change, reloading " + fileToWatch);
    // We need to delete the reference from the cache first (otherwise it won't be reloaded...)
    delete require.cache[require.resolve(fileToWatch)];
    session = require(fileToWatch);

    var results = session.runTests();
    var runStats = {
        action: "consumeTestResults",
        payload: {
            session: session.sessionId,
            testsRun: 10,
            testsPassed: 3,
            testsIgnored: 2
        }
    }
    client.write(JSON.stringify(runStats));
  }
});





// Receive requests from the server
client.on('data', function (payload) {
  var payloadObj;
  var response = {success: true}; // assume success :)

  try{
      payloadObj = JSON.parse(payload);
  }catch(e){
      console.error("ERROR: Couldn't decode message to JSON: ");
      console.error(payload);
      payloadObj = {}; // We'll just use an empty payloadObj
  }
  try{
      switch(payloadObj.action){
        case "processIteration":
          var gen0 = payloadObj.payload.generation0;
          response.payload = {
            generation0: gen0,
            generation1: session.processIteration(gen0)
          }
          break;
        case "getClientInfo":
          response.payload = {
            "team": session.team,
            "session": session.sessionId,
            "language": "javascript",
          };
          break;
        default:
          response = {
            success: false,
            message: "I don't understand the action requested: "+payloadObj.action,
            request: payloadObj
          };
      }
  }catch(e){
      response = {
        success: false,
        message: "Error interacting with loaded JavaScript",
        request: payloadObj
      };
  }
  response.respondingTo = payloadObj.action;
  client.write(JSON.stringify(response));
});

// Handle the server closing the connection
client.on('close', function() {
	console.log('Connection closed');
});
