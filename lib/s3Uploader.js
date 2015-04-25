"use strict";

var assert = require("assert"),
    fs = require("fs"),
    url = require("url");

var Uploader = require("s3-streaming-upload").Uploader;

module.exports = function(target, outputs, cleanup) {
  var outputURI = url.parse(target);

  assert.equal("s3:", outputURI.protocol, "Only S3 outputs are supported");

  // grab the last output
  var output = outputs.pop();

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
};
