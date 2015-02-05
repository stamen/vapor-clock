"use strict";

var assert = require("assert"),
    util = require("util");

var clone = require("clone");

var shell = require("./shell");

/**
 * Resample an input source using UTM grids, resulting in web mercator rasters.
 *
 * Options:
 *  input:
 *  "/vsicurl/http://data.stamen.com.s3.amazonaws.com/srtm/SRTM-4326.vrt"
 *  utmZone: "10N"
 *  zoom: 7
 */
module.exports = function(input, output, options, callback) {
  try {
    assert.ok(options.zoom, "resample: zoom is required");
    assert.ok(options.utmZone, "resample: UTM zone is required");
  } catch (err) {
    return callback(err);
  }

  // (2 * pi * earth radius (in meters) * cos(lat)) / pixel width(zoom)
  var targetResolution = ((2 * Math.PI * 6372.7982 * 1000 * Math.cos(0)) / (2 * Math.pow(2, options.zoom + 8))).toFixed(3),
      utmZone = ("00" + options.utmZone).slice(-3),
      hemi = utmZone.slice(2).toLowerCase(),
      zone = utmZone.slice(0, 2);

  var args = [
    "-q",
    "-t_srs", "EPSG:3857",
    "-te", -20037508.34, -20037508.34, 20037508.34, 20037508.34, // provide a full extent; -crop_to_cutline will reduce this
    "-tr", targetResolution, targetResolution,
    "-tap",
    "-srcnodata", -32768,
    "-dstnodata", -32768,
    "-wm", 512, // allow GDAL to work in 512MB chunks (diminishing returns beyond this, supposedly)
    "-cutline", "/vsizip/vsicurl/http://data.stamen.com.s3.amazonaws.com/openterrain/support/UTM_Zone_Boundaries.zip/UTM_Zone_Boundaries/UTM_Zone_Boundaries.shp",
    "-cwhere", util.format("Zone_Hemi = '%s,%s'", zone, hemi), // target a specific UTM zone
    "-cblend", 1, // include a pixel of overlap
    "-crop_to_cutline", // restrict the target extent to that of the selected cutline
    "-wo", "NUM_THREADS=ALL_CPUS",
    "-multi",
    "-co", "tiled=yes",
    "-co", "compress=lzw",
    "-co", "predictor=2",
    "-r", "bilinear",
    input,
    output
  ];

  var env = clone(process.env);

  env.GDAL_CACHEMAX = 512;
  env.GDAL_DISABLE_READDIR_ON_OPEN = true;
  env.CPL_VSIL_CURL_ALLOWED_EXTENSIONS = ".tiff,.zip,.vrt";

  return shell("gdalwarp", args, {
    env: env,
    timeout: 10 * 60e3 // 10 minutes
  }, callback);
};

module.exports.streaming = false;
