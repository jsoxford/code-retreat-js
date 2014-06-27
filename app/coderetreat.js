#! /usr/bin/env node
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var net = require('net');
var fs = require('fs');
var fsTimeout; // used to prevent the watch event firing many times
var connRetryTimeout; //used to retry connection failures
var session; // The loaded Javascript object (or undefined)
var fileToWatch;
var testStatus = {};

// Variables you might want to change
var remoteAddress = '127.0.0.1';
var remotePort = 8787;

// Configure the simple status page and update it every second
app.use(express.static(__dirname + '/public'));
setInterval(function () {
    io.emit('testStatus', testStatus);
});
http.listen(3000, function () {
    console.log("Listening on localhost:3000")
});

/**
 * TODO
 * Run test suite
 * Post results to server
 **/

if(process.argv[0] == 'node' && process.argv.length == 3){
    fileToWatch = process.argv[2];
}else if(process.argv.length == 2){
    fileToWatch = process.argv[1];
}

// If it's not absolute, add on the CWD
if(fileToWatch.substring(0,1) != '/'){
    fileToWatch = process.cwd() + '/' + fileToWatch
}
console.log("Watching " + fileToWatch);

// Connect to the remote server and send capabilities
var client = new net.Socket();
client.connect(remotePort, remoteAddress);

// Load the test suite & code
try{
  session = require(fileToWatch);
  runTests(fileToWatch);
}catch(e){
  console.error("Something went pretty badly wrong. Does that file exist? "+fileToWatch);
  console.error(e);
  process.exit(1);
}

// Watch the file for changes and run the test suite when it does (max once per 5 seconds)
fs.watch(fileToWatch, function(event, filename){
    if(event == 'change' && !fsTimeout){
        fsTimeout = setTimeout(function() { fsTimeout=null }, 5000) // give 5 seconds for multiple events

        console.log("Noticed change, reloading " + fileToWatch);
        // We need to delete the reference from the cache first (otherwise it won't be reloaded...)
        delete require.cache[require.resolve(fileToWatch)];
        session = require(fileToWatch);
        runTests(fileToWatch);
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

client.on('connect', function () {
    console.log('Connected to ' + remoteAddress);
})
// Handle the server closing the connection
// Try once more to connect
client.on('close', function() {
    if(!connRetryTimeout){
	    console.log('Communication failure...');
        connRetryTimeout = setTimeout(function() { connRetryTimeout = null; client.connect(remotePort, remoteAddress) }, 5000);
    }
});

client.on('error', function(e) {
    if(!connRetryTimeout){
        console.error("Could not connect to server, are you connected to the network? Retrying connection in 5 seconds...");
        connRetryTimeout = setTimeout(function() { connRetryTimeout = null; client.connect(remotePort, remoteAddress) }, 5000);
    }
});

function runTests(event, filename){
    testStatus = session.runTests();
    var runStats = {
        action: "consumeTestResults",
        payload: {
            team: session.team,
            session: session.sessionId,
            testsRun: testStatus.testsRun,
            testsFailed: testStatus.testsFailed,
            testsIgnored: testStatus.testsIgnored,
        }
    }
    client.write(JSON.stringify(runStats));
}
