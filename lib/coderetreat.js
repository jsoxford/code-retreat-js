var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var net = require('net');
var fs = require('fs');


var fsTimeout; // used to prevent the watch event firing many times
var connRetryTimeout; //used to retry connection failures
var session; // The loaded Javascript object (or undefined)

var testStatus = {};
var client;

// Variables you might want to change
var remoteAddress = '127.0.0.1';
var remotePort = 8787;

    /**
     * TODO
     * Run test suite
     * Post results to server
     **/

exports.run = function(fileToWatch) {

    // If it's not absolute, add on the CWD
    if(fileToWatch.substring(0,1) != '/'){
        fileToWatch = process.cwd() + '/' + fileToWatch
    }

    console.log("Watching " + fileToWatch);

    // Connect to the remote server and send capabilities
    client = new net.Socket();
    client.connect(remotePort, remoteAddress);

    loadAndTest(fileToWatch);

    // Watch the file for changes and run the test suite when it does (max once per 5 seconds)
    fs.watch(fileToWatch, function(event, filename){
        if(event == 'change' && !fsTimeout){
            fsTimeout = setTimeout(function() { fsTimeout=null }, 1000) // give 1 second for multiple events
            loadAndTest(fileToWatch);
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
                // generation1: session.processIteration(gen0)
              }
              break;
            case "getClientInfo":
              response.payload = {
                // "team": session.team,
                // "session": session.sessionId,
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
    // Try once more to connect
    client.on('close', function() {
        if(!connRetryTimeout){
            connRetryTimeout = setTimeout(function() { connRetryTimeout = null; client.connect(remotePort, remoteAddress) }, 5000);
        }
    });

    client.on('error', function(e) {
        if(!connRetryTimeout){
            connRetryTimeout = setTimeout(function() { connRetryTimeout = null; client.connect(remotePort, remoteAddress) }, 5000);
        }
    });

}

function loadAndTest(fileName) {
    console.log("testing " + fileName);
    // Load the test suite & code
    try{
        // Set up Mocha to test the file
        var should = require('should');
        var Mocha = require('mocha');
        var mocha = new Mocha({ui: 'bdd'});
        mocha.addFile(fileName)
        mocha.loadFiles();
        // mocha.reporter(function(runner) {
        //     var stats = {
        //         tests: 0,
        //         passes: 0,
        //         pending: 0,
        //         failures: []
        //     };
        //
        //     runner.on('start', function () {
        //         process.stdout.write('      ');
        //     });
        //     runner.on('pass', function(test){
        //         stats.passes++;
        //         process.stdout.write('✓ ');
        //     });
        //
        //     runner.on('pending', function(test){
        //         stats.pending++;
        //         process.stdout.write('.');
        //     });
        //
        //     runner.on('fail', function(test, err){
        //         stats.failures.push({test: test, err: err});
        //         process.stdout.write('✖ ');
        //     });
        //
        //     runner.on('test end', function(test){
        //         stats.tests++;
        //     });
        //
        //     runner.on('end', function(){
        //         process.stdout.write('\n');
        //         for (var i = 0; i < stats.failures.length; i++) {
        //             console.log('fail: %s -- error: %s', stats.failures[i].test.fullTitle(), stats.failures[i].err.message);
        //         }
        //         if(stats.failures.length){
        //             process.stdout.write('\n');
        //         }
        //
        //         // Publish results to server
        //         sendMessage("consumeTestResults", {
        //             testsRun: stats.tests,
        //             testsFailed: stats.failures.length,
        //             testsIgnored: stats.pending,
        //         });
        //     });
        // });
        mocha.run();
    }
    catch(e){
      console.error("Something went pretty badly wrong. Does that file exist? "+fileName);
      console.error(e);
      process.exit(1);
    }
}

function sendMessage(action, payload){
    client.write(JSON.stringify({action: action, payload: payload}));
}
