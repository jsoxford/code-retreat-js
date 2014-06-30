// exports.sessionId = 0;
// exports.team = [
//   {"name": "Ryan Brooks"},
//   {"name": "Ben Foxall"}
// ];
//
// exports.processIteration = function(generation0){
//   return "00010010011110111101011010101";
// }
//
// exports.runTests = function(){
//     console.log("Whoop, I ran a test");
//     return {
//         testsRun: 110,
//         testsFailed: 23,
//         testsIgnored: 1
//     }
// }

describe("Something", function () {
    it("Should do something cool", function () {
        (5).should.be.exactly(5).and.be.a.Number;
        //(5).should.be.exactly(3).and.be.a.String;
    });
    it("Should do something else cool", function () {
        (5).should.be.exactly(5).and.be.a.Number;
    });
});
