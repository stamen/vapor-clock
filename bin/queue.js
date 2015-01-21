#!/usr/bin/env node
"use strict";

var env = require("require-env"),
    exquisite = require("exquisite");

var queue = exquisite({
  name: env.require("SQS_QUEUE_NAME")
}).queue;

queue.queueTask({
  name: "reproject NED to 3857",
  input: "/vsizip/vsicurl/http://ned.stamen.com.s3.amazonaws.com/13arcsec/n25w081.zip/n25w081/floatn25w081_13.flt",
  output: "s3://ned.stamen.com/13arcsec/3857/n25w081.tiff",
  operations: [
    {
      type: "reproject",
      options: {
        targetSRS: "EPSG:3857"
      }
    }
  ]
});

queue.queueTask({
  name: "reproject SRTM to 3857",
  input: "/vsizip/vsicurl/http://data.stamen.com.s3.amazonaws.com/srtm/source/srtm_01_07.zip/srtm_01_07.tif",
  output: "s3://data.stamen.com/srtm/3857/srtm_01_07.tiff",
  operations: [
    {
      type: "reproject",
      options: {
        targetSRS: "EPSG:3857"
      }
    }
  ]
});
