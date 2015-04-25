#!/usr/bin/env node
"use strict";

var util = require("util");

var assert = require("assert"),
    async = require("async"),
    fs = require("fs"),
    tmp = require("tmp"),
    env = require("require-env");

var worker = require("../lib/worker"),
    upload = require("../lib/localUploader.js");

var runWorker = function(task, callback) {
  worker(0, task, upload, function(err) {
    if (err) {
      callback(err);
    }

    return callback(null, arguments);
  });
};

var argv = process.argv.slice(2);

assert.equal(1, argv.length, "A file containing the operation json must be provided.");

var task = JSON.parse(fs.readFileSync(argv.shift(), 'utf8'));
console.log("Attempting " + JSON.stringify(task));

runWorker(task, function(err, output) {
  if(err) {
    console.log(err);
  } else {
    console.log("Completed successfully:" + output);
  }  
});
