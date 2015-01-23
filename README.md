# vapor-clock

Cloud-powered offline tasks.

## Tasks

This is a task definition that uses the `reproject` option to reproject an SRTM
cell to Web Mercator (EPSG:3857). `input` is passed directly to `gdalwarp`;
you'll almost always want to use `/vsicurl` to point at remote sources. In
this case, `/vsizip` is also used, as the source raster is contained in a zip
file. Output is written to the URL provided in `output` (only S3 buckets are
supported, and data is written with the `public-read` ACL).

```javascript
{
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
}
```

## Operations

### hillshade

Generates hillshades using `gdaldem`.

### reproject

Reprojects GDAL-readable rasters to `targetSRS`.

#### Options

* `targetSRS` - Target SRS. Equivalent to `gdalwarp`'s `-t_srs` option.
  Required.

## Environment Variables

* `AWS_ACCESS_KEY_ID` - Optional if instance roles are used.
* `AWS_SECRET_ACCESS_KEY` - Optional if instance roles are used.
* `SENTRY_DSN` - Sentry DSN for error reporting. Optional.
* `SQS_QUEUE_NAME` - Queue name. This is also used as the prefix (with
  `_failed`) for the dead letter queue. Required.

## Required Permissions

The AWS credentials must have sufficient access to create / modify / read
/ write SQS queues named `SQS_QUEUE_NAME` and `${SQS_QUEUE_NAME}_failed`. You
should also grant access to any S3 buckets you wish to write to.

## Miscellany

To create a VRT for S3-hosted SRTM data, do something like this:

```bash
(for f in $(< srtm.list); do echo /vsicurl/http://data.stamen.com.s3.amazonaws.com/srtm/3857/${f%%.zip}.tiff; done) | xargs gdalbuildvrt srtm.vrt
```

You can then refer to an S3-hosted version of that VRT:

```bash
gdalwarp -te -124.7494 45.5437 -116.9161 49.0049 \
  /vsicurl/http://data.stamen.com.s3.amazonaws.com/srtm/SRTM-4326.vrt \
  SRTM-washington.tiff
```
