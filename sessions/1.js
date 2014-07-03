// Session 0, I'm awesome

exports.tick = function(generation0){
    console.log("TICK!");
    return generation0;
}

describe("Something", function () {
    it("Should do something cool", function () {
        (5).should.be.exactly(5).and.be.a.Number;
        (5).should.be.exactly(3).and.be.a.String;
    });
    it("Should do something else cool", function () {
        (5).should.be.exactly(5).and.be.a.Number;
    });
});
