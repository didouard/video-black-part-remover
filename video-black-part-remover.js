var async              = require('async');
var EE                 = require('eventemitter3');
var moment             = require('moment');
var fs                 = require('fs');

var ffmpeg             = require('../node-fluent-ffmpeg/index.js');

var regexBlackDetect   = /^\s*.*black_start:([\d\.]+) black_end:([\d\.]+) black_duration:([\d\.]+)\s*$/;

var remover = function (data, opt, callback) {
  var emitter = undefined;
  var videos = undefined;
  var options = undefined;

  var startOne = function (video, callback) {
    emitter.emit('debug', '\n ---- ' + moment().format("dddd, MMMM Do YYYY, h:mm:ss a"));

    var detect = function (callback) {
      var data = [];
      if (options.minimum_duration) data.push("d=" + options.minimum_duration);
      if (options.black_ratio) data.push("pic_th=" + options.black_ratio);
      if (options.pixel_threshold) data.push("pix_th=" + options.pixel_threshold);
      var filter = 'blackdetect=' + data.join(':');

      var black_parts = [];

      ffmpeg(video.source)
        .videoFilter(filter)
        .on('start', function (command) {
          emitter.emit('start', 'Detect');
          emitter.emit('debug', command);
        })
        .on('error', function (stdout, stderr) {
          callback({stdout: stdout, stderr: stderr});
        })
        .on('end', function () {
          emitter.emit('end', 'Detect');
          return callback(null, black_parts);
        })
        .on('progress', function (progress) {
          emitter.emit('progress', progress);
        })
        .on('stderr', function (line) {
          var match = line.match(regexBlackDetect);
          if (! match) return ;
          var data = {start: match[1]
                      , end: match[2]
                      , duration: match[3]};
          black_parts.push(data);
        })
        .format('null')
        .output('/dev/null')
        .run();
    };

    var processParts = function (black_parts, callback) {
      var parts = [];
      var start = null;
      for (var i = 0; i < black_parts.length; i++) {
        var part = { id : i
                    , start: start
                    , end: black_parts[i].start
                    , duration: (black_parts[i].start - start|0) 
                   };
        start = black_parts[i].end;
        parts.push(part);
      }
      part = {start: start, end:null, duration: null, id: i};
      parts.push(part);
      return callback(null, parts);
    };
    
    var remove = function (parts, callback) {
      async.map(parts, function (part, callback) {
        var command = ffmpeg(video.source)
          .videoCodec('libx264')
          .size('1280x720')
          .audioCodec('copy')
          .on('start', function (command) {
            emitter.emit('start', 'Part #' + part.id + ' with command: ' + command);
          })
          .on('error', function (stdout, stderr) {
            callback({stdout: stdout, stderr: stderr});
          })
          .on('end', function () {
            emitter.emit('end', "Finish part #" + part.id);
            return callback();
          })
          .on('progress', function (progress) {
            emitter.emit('progress', progress);
          })
          .format('mpegts')
          .output('/tmp/part_' + part.id + '.ts');

        if (part.start | 0 > 0)
          command.seekInput(part.start)
        if (part.duration | 0 > 0)
          command.duration(part.duration)

        command.run();        
      }, function (err, results) {
        if (err) return callback(err);
        callback(null, parts);
      });
    };
    
    var aggregate = function (parts, callback) {
      if (parts.length < 2) {
        emitter.emit('debug', 'mv ' + '/tmp/part_0.ts ' + video.destination);
        return fs.rename('/tmp/part_0.ts', video.destination, callback);
      }

      var command = undefined;
      for (var i = 0; i < parts.length; i++) {
        if (i < 1) command = ffmpeg('/tmp/part_' + i + '.ts')
        else command.input('/tmp/part_' + i + '.ts');
      }
      command.on('start', function (command) {
          emitter.emit('start', 'Merge : Spawned Ffmpeg with command: ' + command);
        }).on('error', function (stdout, stderr) {
          callback({stdout: stdout, stderr: stderr});
        }).on('end', function () {
          emitter.emit('end', "Merge finish");
          return callback();
        }).on('progress', function (progress) {
          emitter.emit('progress', progress);
        }).format('mpegts')
        .mergeToFile(video.destination);
      
    };
    
    var jobs = [detect, processParts, remove, aggregate];
    async.waterfall(jobs, function (err, results) {
      if (err) {
        emitter.emit('error', err);
      }
      emitter.emit('end', 'done');
      callback();
    });
  };

  this.load = function (data, opt, callback) {
    emitter = new EE();
    videos = (data instanceof Array) ? data : [data];
    options = (!opt) ? {} : opt;
    callback(emitter);
  };

  this.start = function () {
    async.mapLimit(videos, 1, startOne, function (err, results) {
      if (err) return callback(err);      
    });
  };
};

module.exports = function (data, opt, callback) {
  var object = new remover();
  object.load(data, opt, callback);
  return object;
};