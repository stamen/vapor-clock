"use strict";

var execFile = require("child_process").execFile;

var async = require("async"),
    env = require("require-env"),
    exquisite = require("exquisite"),
    holdtime = require("holdtime"),
    raven = require("raven");

var QUEUE_NAME = env.require("QUEUE_NAME"),
    TYPE_MAP = {
      copy: "aws",
      warp: "gdalwarp"
    },
    DEFAULT_ARGS = {
      copy: [
        "s3",
        "cp",
        "--region", "us-east-1",
        "--acl", "public-read"
      ]
    };

var sentry = new raven.Client();

/**
 * Task definition:
 * name: task name
 * input: source URL
 * operations: operation[]
 * output: target URL
 *
 * operation:
 * type: warp
 * args: []
 */

var convertTypeToCommand = function(type) {
  var cmd = TYPE_MAP[type];

  if (cmd) {
    return cmd;
  }

  throw new Error("Unrecognized task type: " + type);
};

module.exports = function(id) {
  return exquisite({
    name: QUEUE_NAME
  }, function(task, cb) {
    var done = function(err) {
      if (err) {
        console.warn(err.message);
        sentry.captureError(err, {
          extra: {
            task: task
          }
        });
      }

      return cb.apply(null, arguments);
    };

    console.log("Processing task %j:", task);

    task.operations = task.operations || [];

    return async.eachSeries(task.operations, function(op, callback) {
      var cmd;

      try {
        cmd = convertTypeToCommand(op.type);
      } catch (err) {
        return callback(err);
      }

      var args = (DEFAULT_ARGS[op.type] || []).concat(op.args);

      console.log("args:", args);

      var child = execFile(cmd, args, holdtime(function(err, stdout, stderr, elapsed) {
        console.log("%s.%s: %dms", id, op.type, elapsed);

        if (err) {
          return callback(err);
        }

        console.log("%s.%s.stdout:", id, op.type, stdout);
        console.log("%s.%s.stderr:", id, op.type, stderr);

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
      });
    }, done);
  });
};
