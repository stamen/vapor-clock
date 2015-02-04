"use strict";

var shell = require("./shell");

module.exports = function(input, output, options, callback) {
  options = options || {};

  // TODO zfactor
  // TODO azimuth
  // TODO combined
  // TODO algorithm
  options.scale = options.scale || 1;

  var args = [
    "hillshade",
    "-q",
    "-s", options.scale,
    "-co", "tiled=yes",
    "-co", "compress=lzw",
    "-co", "predictor=2",
    input,
    output
  ];

  return shell("gdaldem", args, {}, callback);
};

module.exports.streaming = false;
