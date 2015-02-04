#!/usr/bin/env node
"use strict";

var util = require("util");

var env = require("require-env"),
    exquisite = require("exquisite");

var queue = exquisite({
  name: env.require("SQS_QUEUE_NAME")
}).queue;

var zoom = 8,
    utmZone = "9N";

queue.queueTask({
  name: util.format("resample SRTM to zoom %d (UTM zone %s)", zoom, utmZone),
  input: "/vsicurl/http://data.stamen.com.s3.amazonaws.com/srtm/SRTM-4326.vrt",
  output: util.format("s3://data.stamen.com/srtm/z%d/%s.tiff", zoom, utmZone),
  operations: [
    {
      type: "resample",
      options: {
        zoom: zoom,
        utmZone: utmZone
      }
    }
  ]
});
