var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var net = require('net');
var JSONStream = require('JSONStream');
var es = require('event-stream');
var request = require("request")
var fs = require('fs');
var should = require('should');
var Mocha = require('mocha');
var mocha = new Mocha({
	ui: 'bdd'
});

var fsTimeout; // used to prevent the watch event firing many times
var connRetryTimeout; //used to retry connection failures
var session; // The loaded Javascript object (or undefined)
var testStatus = {};
var client;

// Variables you might want to change
var remoteAddress = '127.0.0.1';
var remotePort = 8787;

exports.run = function(fileToWatch) {

	// If it's not absolute, add on the CWD
	if (fileToWatch.substring(0, 1) != '/') {
		fileToWatch = process.cwd() + '/' + fileToWatch
	}

	console.log("Watching " + fileToWatch);

	// Connect to the remote server and send capabilities
	client = connectToStatsBucket();

	loadAndTest(fileToWatch);

	// Watch the file for changes and run the test suite when it does (max once per 5 seconds)
	fs.watch(fileToWatch, function(event, filename) {
		if (event == 'change' && !fsTimeout) {
			fsTimeout = setTimeout(function() {
				fsTimeout = null
			}, 1500) // give 1.5 seconds for multiple events
			loadAndTest(fileToWatch);
		}
	});
}

function loadAndTest(fileName) {
	// Load the test suite & code
	try {
		// We need to delete the reference from the cache first (otherwise it won't be reloaded by Mocha...)
		delete require.cache[require.resolve(fileName)];

		// Set up Mocha to watch the file
		mocha = new Mocha({
			ui: 'bdd'
		});
		mocha.addFile(fileName);
		mocha.loadFiles();
		mocha.reporter(function(runner) {
			var stats = {
				tests: 0,
				passes: 0,
				pending: 0,
				failures: []
			};

			runner.on('start', function() {
				process.stdout.write('      ');
			});
			runner.on('pass', function(test) {
				stats.passes++;
				process.stdout.write('✓ ');
			});

			runner.on('pending', function(test) {
				stats.pending++;
				process.stdout.write('.');
			});

			runner.on('fail', function(test, err) {
				stats.failures.push({
					test: test,
					err: err
				});
				process.stdout.write('✖ ');
			});

			runner.on('test end', function(test) {
				stats.tests++;
			});

			runner.on('end', function() {
				process.stdout.write('\n');
				for (var i = 0; i < stats.failures.length; i++) {
					console.log('fail: %s -- error: %s', stats.failures[i].test.fullTitle(), stats.failures[i].err.message);
				}
				if (stats.failures.length) {
					process.stdout.write('\n');
				}

				// Publish results to server
				sendMessage("consumeTestResults", {
					testsRun: stats.tests,
					testsFailed: stats.failures.length,
					testsIgnored: stats.pending,
				});
			});
		});
		mocha.run();

		// Update the session object
		session = require(fileName);
	} catch (e) {
		if (e.code === 'MODULE_NOT_FOUND') {
			console.error("Something went pretty badly wrong. Does that file exist?");
			process.exit(1);
		} else {
			console.error("Failed to load your code, do you have errors in your JavaScript? Exception:");
			console.error(e);
		}
	}
}

function connectToStatsBucket() {

	//Get the *actual* stats endpoint from a static endpoint
	request({
		url: 'http://jsoxford.com/cr.json',
		json: true
	}, function(error, response, body) {

		if (!error && response.statusCode === 200) {
			remoteAddress = body.endpoint.host;
			remotePort = body.endpoint.port;
		} else {
			console.log("Couldn't grab config from jsoxford, continuing using localhost");
		}
	})

	client = new net.Socket();
	client.connect(remotePort, remoteAddress);

	// Handle the server closing the connection
	// Try once more to connect
	client.on('close', function() {
		if (!connRetryTimeout) {
			connRetryTimeout = setTimeout(function() {
				connRetryTimeout = null;
				connectToStatsBucket()
			}, 5000);
		}
	});

	client.on('error', function(e) {
		if (!connRetryTimeout) {
			connRetryTimeout = setTimeout(function() {
				connRetryTimeout = null;
				connectToStatsBucket()
			}, 5000);
		}
	});

  client.pipe(JSONStream.parse(true))
		.pipe(es.mapSync(processPayload))

	return client;
}

function processPayload(payload){
  var response = {
    success: true
  }; // assume success :)

  try {
    switch (payload.action) {
      case "tickBoard":
        response.payload = [{
          generation: payload.payload.generation,
          result: payload.payload.result
        }, {
          generation: payload.payload.generation + 1,
          result: session.tickBoard(payload.payload.result)
        }];
        break;
      case "tickCell":
        response.payload = [{
          generation: payload.payload.generation,
          result: payload.payload.result
        }, {
          generation: payload.payload.generation + 1,
          result: session.tickCell(payload.payload.result)
        }];
        break;
      default:
        response = {
          success: false,
          message: "I don't understand the action requested: " + payload.action,
          request: payload
        };
    }
  } catch (e) {
    response = {
      success: false,
      message: "Error interacting with loaded JavaScript",
      request: payload
    };
  }
  response.respondingTo = payload.action;
  client.write(JSON.stringify(response));
}

function sendMessage(action, payload) {
	client.write(JSON.stringify({
		action: action,
		payload: payload
	}));
}
