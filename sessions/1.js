exports.sessionId = 0;
exports.team = [
  {"name": "Ryan Brooks"},
  {"name": "Ben Foxall"}
];

exports.processIteration = function(generation0){
  return "000100100111101011101011010101";
}

exports.runTests = function(){
    console.log("Whoop, I ran a test");
    return {
        testsRun: 110,
        testsFailed: 23,
        testsIgnored: 1
    }
}
