"use strict";

var assert = require("assert"),
    execFile = require("child_process").execFile;

var holdtime = require("holdtime");

module.exports = function(input, output, options, callback) {
  try {
    assert.ok(options.targetSRS, "reproject: Target SRS is required");
  } catch (err) {
    return callback(err);
  }

  options.timeout = options.timeout || 15 * 60e3;

  var args = [
    "-q",
    "-t_srs", options.targetSRS,
    "-wo", "NUM_THREADS=ALL_CPUS",
    "-multi",
    "-co", "tiled=yes",
    "-co", "compress=lzw",
    "-co", "predictor=2",
    "-r", "lanczos",
    input,
    output
  ];

  var child = execFile("gdalwarp", args, {
    timeout: options.timeout
  }, holdtime(function(err, stdout, stderr, elapsed) {
    console.log("warp: %dms", elapsed);

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
      process.removeListener(signal, exitListener);
    });
  });
};

module.exports.streaming = false;
