var logger = require('node-wrapper/logger').create('video-black-part-remover');
var remover = require('./video-black-part-remover.js');

var options = { minimum_duration: '2'
                , black_ratio: '0.99'
                , pixel_threshold: '0.10'
                , debug: true
              };
remover(['/mnt/Informatique/tmp/test-black-part.ts'], options, function (emitter) {
  emitter.on('error', function (error) {
    logger._error(error);
  }).on('start', function (data) {
    logger._log("start:", data);
  }).on('detect', function (data) {
    logger._log("Detect:", data);
  }).on('remove', function (data) {
    logger._log("Remove:", data);
  }).on('end', function (data) {
    logger._log("End:", data);
  }).on('debug', function (data) {
    logger._debug(data);
  });
}).start();