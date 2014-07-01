code-retreat-js
===============

Javascript runner for code retreat

## Getting set up

The first step is to run the script `bin/addToPath.sh`. This will add the JavaScript, Ruby and Python wrappers to your PATH for your current session.

## What do I do

* Run `coderetreat NAMEOFMYFILE`
* Edit file in your editor, add some tests
* Save!
* Look at the terminal output for test results
* Rinse and repeat


## Development

### Contributing

This project welcomes pull requests! We also love issues and generally knowing that this project is (or at least could be) useful! Reach out to us in comments, issues or [on Twitter](https://twitter.com/intent/user?screen_name=jsoxford).

### Local testing
You can use `netcat` to simulate the server and send messages:

```bash
netcat -lp 8787
```

### Messaging

The `coderetreat` wrapper communicates with a central stats-collecting server using simple stream connections and JSON payloads.


#### Stats update

Whenever a test is run the stats are posted to the server in the following format:
```json
{
  "action": "consumeTestsResults",
  "payload": {
    "testsRun": 10,
    "testsFailed": 5,
    "testsIgnored": 2
  }
}
```

This is the only unsolicited transmission from client.

#### Process an iteration

The server requests an iteration:

```json
{
  "action": "processIteration",
  "payload": {
    "generation0": "000011101010101110111101101"
  }
}
```
The client responds with the next iteration:
```json
{
  "respondingTo": "processIteration",
  "payload": {
    "generation0": "000100100111101011101011010101",
    "generation1": "000100100111101011101011010101",
  }
}
```
or an error:
```json
{
  "respondingTo": "processIteration",
  "payload": {
    "error": "The function could not be executed."
  }
}
```

#### Provide information about the team (OPTIONAL)

To build a running commentary of who has worked on which session/table, the server requests the team information:
```json
{
  "action": "getClientInfo",
}
```

In turn the client responds with information about the team members:
```json
{
  "respondingTo": "getClientInfo",
  "payload": {
    "team": [
      {"name": "Ryan Brooks"},
      {"name": "Ben Foxall"}
    ],
    "session": 0,
    "language": "javascript",
  }
}
```
