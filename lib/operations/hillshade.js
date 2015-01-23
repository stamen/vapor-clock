"use strict";

var execFile = require("child_process").execFile;

var holdtime = require("holdtime");

module.exports = function(input, output, options, callback) {
  options = options || {};

  // TODO zfactor
  // TODO scale
  // TODO azimuth
  // TODO combined
  // TODO algorithm
  options.timeout = options.timeout || 15 * 60e3;

  var args = [
    "hillshade",
    "-q",
    "-co", "tiled=yes",
    "-co", "compress=lzw",
    "-co", "predictor=2",
    input,
    output
  ];

  var child = execFile("gdaldem", args, {
    timeout: options.timeout
  }, holdtime(function(err, stdout, stderr, elapsed) {
    console.log("hillshade: %dms", elapsed);

    if (err) {
      return callback(err);
    }

    return callback();
  }));

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  var alive = true,
      exitListener = function() {
        if (alive) {
          child.kill("SIGKILL");
        }
      };

  // terminate child processes when this process exits
  ["SIGINT", "SIGTERM"].forEach(function(signal) {
    process.once(signal, exitListener);
  });

  // mark the child as dead when it exits
  child.on("exit", function() {
    alive = false;

    // remove event listeners
    ["SIGINT", "SIGTERM"].forEach(function(signal) {
      if (process.listeners(signal).indexOf(exitListener) >= 0) {
        process.removeListener(signal, exitListener);
      }
    });
  });
};

module.exports.streaming = false;
