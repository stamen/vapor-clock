"use strict";

var execFile = require("child_process").execFile;

var holdtime = require("holdtime");

module.exports = function(cmd, args, options, callback) {
  options.timeout = options.timeout || 15 * 60e3;

  var child = execFile(cmd, args, options, holdtime(function(err, stdout, stderr, elapsed) {
    console.log("%s: %dms", cmd, elapsed);

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
