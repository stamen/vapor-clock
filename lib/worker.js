"use strict";

var assert = require("assert"),
    fs = require("fs"),
    https = require("https"),
    url = require("url");

var async = require("async"),
    tmp = require("tmp"),
    Uploader = require("s3-streaming-upload").Uploader;

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

module.exports = function(id, task, done) {
  console.log("Processing task %j:", task);

  var outputURI;

  try {
    assert.ok(Array.isArray(task.operations), "Operations must be an array");
    assert.equal(1, task.operations.length, "Only single operation pipelines are supported at the moment");
    assert.ok(task.input, "An input is required");
    assert.ok(task.output, "An output is required (for now)");

    outputURI = url.parse(task.output);

    assert.equal("s3:", outputURI.protocol, "Only S3 outputs are supported");
  } catch (err) {
    return done(err);
  }

  var input = task.input;

  // TODO consider waterfall?
  return async.mapSeries(task.operations, function(op, callback) {
    // TODO sanitize / check op.type (to prevent arbitrary files from being loaded)
    var operation = require("./operations/" + op.type);

    console.log("%s supports streaming:", op.type, operation.streaming);

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

    // grab the last output
    var output = outputs.pop();

    // TODO tmp files aren't cleaned up when the process is terminated

    var cleanup = function(err) {
      fs.unlink(output, function() {});

      return done(err);
    };

    var uploader = new Uploader({
      bucket: outputURI.hostname,
      // strip the leading /
      objectName: outputURI.pathname.slice(1),
      objectParams: {
        ACL: "public-read"
      },
      stream: fs.createReadStream(output)
    });

    uploader
      .on("completed", cleanup)
      .on("failed", cleanup);
  });
};
