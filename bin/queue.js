#!/usr/bin/env node
"use strict";

var env = require("require-env"),
    exquisite = require("exquisite");

var queue = exquisite({
  name: env.require("QUEUE_NAME")
}).queue;

queue.queueTask({
  name: "test",
  operations: [
    {
      type: "warp",
      args: [
        "-q",
        "-t_srs", "EPSG:3857",
        "-wo", "NUM_THREADS=ALL_CPUS",
        "-tr", 10, 10,
        "-tap",
        "-multi",
        "-co", "tiled=yes",
        "-co", "compress=lzw",
        "-co", "predictor=2",
        "-r", "lanczos",
        "/vsizip/data/n38w122.zip/n38w122/floatn38w122_13.flt",
        "data/n38w122.tiff"
      ]
    },
    {
      type: "copy",
      args: [
        "data/n38w122.tiff",
        "s3://data.stamen.com/tmp/"
      ]
    }
  ]
}, {
  maxAttempts: 10
});
