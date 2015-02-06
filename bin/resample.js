#!/usr/bin/env node
"use strict";

var util = require("util");

var async = require("async"),
    env = require("require-env"),
    exquisite = require("exquisite");

var CELL_PADDING = 1,
    CELL_HEIGHT = 1024,
    CELL_WIDTH = CELL_HEIGHT,
    // WGS 84 semi-major axis (m)
    SEMI_MAJOR_AXIS = 6378137;

var queue = exquisite({
  name: env.require("SQS_QUEUE_NAME")
}).queue;

var zoom = 8;

var pixelWidth = Math.pow(2, zoom + 8),
    pixelHeight = pixelWidth,
    // 2 * pi * earth radius * cos(lat)
    circumference = 2 * Math.PI * SEMI_MAJOR_AXIS * Math.cos(0),
    // extents
    minX = (circumference / 2) * -1,
    minY = minX,
    maxX = (circumference / 2),
    maxY = maxX,
    // circumference / pixel width(zoom)
    targetResolution = circumference / pixelWidth;

console.log("pixelWidth:", pixelWidth);
console.log("circumference:", circumference);
console.log("(%d, %d, %d, %d)", minX, minY, maxX, maxY);
console.log("targetResolution:", targetResolution);

var width = CELL_WIDTH * targetResolution,
    height = width;

async.times(pixelHeight / CELL_HEIGHT, function(yi, callback) {
  var y1 = Math.max(minY, (yi * height) - (circumference / 2) - (CELL_PADDING * targetResolution)),
      y2 = Math.min(maxY, ((yi + 1) * height) - (circumference / 2) + (CELL_PADDING * targetResolution));

  // flip y to move the origin to the top-left (XYZ)
  yi = pixelHeight / CELL_HEIGHT - yi - 1;

  return async.times(pixelWidth / CELL_WIDTH, function(xi, done) {
    var x1 = Math.max(minX, (xi * width) - (circumference / 2) - (CELL_PADDING * targetResolution)),
        x2 = Math.min(maxX, ((xi + 1) * width) - (circumference / 2) + (CELL_PADDING * targetResolution));

    return queue.queueTask({
      name: util.format("resample SRTM to zoom %d (%d/%d)", zoom, xi, yi),
      input: "/vsicurl/http://data.stamen.com.s3.amazonaws.com/srtm/SRTM-4326.vrt",
      output: util.format("s3://data.stamen.com/srtm/z%d/%d/%d.tiff", zoom, xi, yi),
      operations: [
        {
          type: "resample",
          options: {
            targetExtent: [x1, y1, x2, y2],
            targetResolution: [targetResolution, targetResolution]
          }
        }
      ]
    }, {
      maxAttempts: 5
    }, done);
  }, callback);
}, function(err) {
  if (err) {
    console.warn(err);
  }

  console.log("done.");
});
