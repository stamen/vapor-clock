"use strict";

var assert = require("assert"),
    fs = require("fs");

module.exports = function(target, outputs, cleanup) {
  // grab the last output
  var output = outputs.pop();

  fs.rename(output, target, cleanup);
};
