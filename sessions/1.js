// Session 0, I'm awesome

exports.tickCell = function(generation0){
  var lives;
    var liveCellsIncludingSelf = generation0.match(/1/g);
    if(generation0[4] === '1'){

      //Any live cell with fewer than two live neighbours dies, as if caused by under-population.
      if(liveCellsIncludingSelf.length < 3){
        lives = false;
      }

      //Any live cell with two or three live neighbours lives on to the next generation.
      else if(liveCellsIncludingSelf.length == 3 || liveCellsIncludingSelf.length == 4){
        lives = true;
      }

      //Any live cell with more than three live neighbours dies, as if by overcrowding.
      else{
        lives = false;
      }

    }
    else{
      //Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
      if(liveCellsIncludingSelf.length == 3){
        lives = true;
      }
      else{
        lives = false;
      }
    }

    return !lives;
}

exports.tickBoard = function(generation0){
    return [generation0];
}

describe("tickCell", function () {
    it("Any live cell with fewer than two live neighbours dies, as if caused by under-population.", function () {
      var inputs = [
        '100'+'010'+'000',
        '010'+'010'+'000',
        '001'+'010'+'000',
        '000'+'110'+'000',
        '000'+'011'+'000',
        '000'+'010'+'100',
        '000'+'010'+'010',
        '000'+'010'+'001',
        '000'+'010'+'000',
      ];
      inputs.forEach(function (gen0) {
        var result = exports.tickCell(gen0);
        (result).should.be.false;
      });
    });
    it("Any live cell with two or three live neighbours lives on to the next generation.", function () {
      var inputs = [
      // 2 live neighbours
      '110'+'010'+'000',
      '011'+'010'+'000',
      '001'+'010'+'010',
      '000'+'110'+'001',
      '000'+'111'+'000',
      '001'+'010'+'100',
      '100'+'010'+'010',
      '001'+'110'+'001',
      '011'+'010'+'000',

      // 3 live neighbours
      '110'+'010'+'010',
      '011'+'010'+'010',
      '001'+'010'+'011',
      '000'+'110'+'001',
      '000'+'111'+'100',
      '001'+'010'+'110',
      '100'+'110'+'010',
      '001'+'110'+'001',
      '011'+'010'+'010',
      ];
      inputs.forEach(function (gen0) {
        var result = exports.tickCell(gen0);
        (result).should.be.true;
      });
    });

    it("Any live cell with more than three live neighbours dies, as if by overcrowding.", function () {
      var inputs = [
        '111'+'010'+'010',
        '010'+'010'+'111',
        '110'+'010'+'111',
        '110'+'111'+'010',
        '011'+'011'+'110',
        '111'+'010'+'111',
        '111'+'111'+'010',
        '111'+'111'+'111',
        '010'+'111'+'010',
      ];
      inputs.forEach(function (gen0) {
        var result = exports.tickCell(gen0);
        (result).should.be.false;
      });
    });
    it("Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.", function () {
        var inputs = [
          '110'+'000'+'010',
          '000'+'000'+'111',
          '100'+'000'+'011',
          '110'+'000'+'010',
          '010'+'101'+'000',
          '111'+'000'+'000',
          '000'+'101'+'010',
          '010'+'100'+'010',
        ];
        inputs.forEach(function (gen0) {
          var result = exports.tickCell(gen0);
          (result).should.be.true;
        })
    });

    it("Other dead cells stay dead", function () {
        var inputs = [
          '111'+'000'+'010',
          '000'+'001'+'111',
          '100'+'100'+'011',
          '111'+'100'+'010',
          '111'+'101'+'111',
          '111'+'101'+'111',
          '110'+'101'+'010',
          '110'+'100'+'010',
        ];
        inputs.forEach(function (gen0) {
          var result = exports.tickCell(gen0);
          (result).should.be.false;
        })
    });
});
