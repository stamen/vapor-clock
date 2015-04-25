"use strict";

var assert = require("assert"),
    fs = require("fs"),
    https = require("https"),
    url = require("url");

var async = require("async"),
    holdtime = require("holdtime"),
    tmp = require("tmp");

// bump up the number of concurrent uploads for s3-streaming-upload
// TODO it would be better to provide an agent, but that's not currently
// possible
https.globalAgent.maxSockets = Infinity;

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

module.exports = function(id, task, upload, done) {
  console.log("Processing task:", task.name);

  var outputURI;

  try {
    assert.ok(Array.isArray(task.operations), "Operations must be an array");
    assert.equal(1, task.operations.length, "Only single operation pipelines are supported at the moment");
    assert.ok(task.input, "An input is required");
    assert.ok(task.output, "An output is required (for now)");
  } catch (err) {
    return done(err);
  }

  var input = task.input;

  // TODO consider waterfall?
  return async.mapSeries(task.operations, function(op, callback) {
    // TODO sanitize / check op.type (to prevent arbitrary files from being loaded)
    // likely by loading everything in that directory and not doing arbitrary
    // requires
    var operation = require("./operations/" + op.type);

    // TODO instead, check if the thing that was loaded returns a stream
    if (operation.streaming) {
      throw new Error("Streaming modes not implemented.");
    } else {
      return tmp.tmpName({
        postfix: ".tiff"
      }, function(err, output) {
        if (err) {
          return callback(err);
        }

        return operation(input, output, op.options, function(err) {
          if (err) {
            // clean up the output in case it was created
            fs.unlink(output, function() {});

            return callback(err);
          }

          return callback(null, output);
        });
      });
    }
  }, function(err, outputs) {
    if (err) {
      return done(err);
    }

    var cleanup = holdtime(function(err) {
      console.log("upload: %dms", arguments[arguments.length - 1]);

      outputs.forEach(function(output) {
        fs.unlink(output, function() {});
      });

      return done(err);
    });

    upload(task.output, outputs, cleanup);
  });
};
