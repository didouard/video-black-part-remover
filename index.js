var logger = require('node-wrapper/logger').create('video-black-part-remover');
var remover = require('./video-black-part-remover.js');

var options = { minimum_duration: '8'
                , black_ratio: '0.99'
                , pixel_threshold: '0.10'
                , debug: true
              };
var videos = [ { source: '/mnt/Informatique/tmp/test-black-part42.ts'
                 , destination: '/mnt/Informatique/tmp/test-black-part_clean.ts'}
               , { source: '/mnt/Informatique/tmp/test-black-part.ts'
                 , destination: '/mnt/Informatique/tmp/test-black-part_clean.ts' }
               , { source: '/mnt/Informatique/tmp/test-black-part.ts'
                   , destination: '/tmp/out.ts'}
             ];

remover(videos, options, function (emitter) {
  emitter.on('error', function (error) {
    logger._warn("Video has an error, passing...\n" + error.stdout);
  }).on('start', function (data) {
    logger._log("start:", data);
  }).on('remove', function (data) {
    logger._log("Remove:", data);
  }).on('end', function (data) {
    logger._log("End:", data);
  }).on('progress', function (data) {
    process.stdout.clearLine();  // clear current text
    process.stdout.cursorTo(0);  // move cursor to beginning of line
    process.stdout.write("Progression: " + Math.round(data.percent) + "%");
//    console.log(Math.round(data.percent));
  }).on('debug', function (data) {
    logger._debug(data);
  });
}).start();