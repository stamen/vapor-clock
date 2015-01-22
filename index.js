#!/usr/bin/env node
"use strict";

/* eslint-disable no-process-exit */

var os = require("os");

var async = require("async"),
    env = require("require-env"),
    exquisite = require("exquisite"),
    raven = require("raven");

var worker = require("./lib/worker");

var QUEUE_NAME = env.require("SQS_QUEUE_NAME");

var sentry = new raven.Client(),
    workers = [];

process.setMaxListeners(os.cpus().length * 2);

if (process.env.SENTRY_DSN) {
  raven.patchGlobal(function(logged, err) {
    console.log("Uncaught error. Reporting to Sentry and exiting.");
    console.error(err.stack);
    process.exit(1);
  });
}

// Start <nprocs> workers

async.times(os.cpus().length, function(n, callback) {
  workers.push(exquisite({
    name: QUEUE_NAME
  }, function(task, cb) {
    return worker(n, task, function(err) {
      if (err) {
        console.warn(err.message);
        sentry.captureError(err, {
          extra: {
            task: task
          }
        });
      }

      return cb.apply(null, arguments);
    });
  }));

  return callback();
});

// Signal handlers

var cleanup = function() {
  // cancel all workers (prevent them from picking up new jobs so we can quit
  // gracefully)
  workers.forEach(function(x) {
    x.cancel();
  });
};

// Quit immediately when receiving 2+ signals within 5s

["SIGINT", "SIGTERM"].forEach(function(signal) {
  process.once(signal, function() {
    cleanup();

    setTimeout(function() {
      process.once(signal, function() {
        cleanup();
      });
    }, 5000).unref();
  });
});
