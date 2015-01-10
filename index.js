var fs = require('fs'),
    nanotimer = require('nanotimer'),
    moment = require('moment'),
    _ = require('lodash'),
    midi = require('midi');

var thrust = require('node-thrust');
var path = require('path');

thrust(function (err, api) {
    var url = 'file://' + path.resolve(__dirname, 'html/index.html');
    var window = api.window({
        root_url: url,
        size: {
            width: 1024,
            height: 700
        }
    });
    window.show();
    window.focus();

    window.on('remote', function (evt) {
        switch (evt.message.action){
            case 'load': {
                load(function(err, data){
                    if (err){
                        return window.remote({message: err});
                    }
                    window.remote({action: 'projectLoaded', message: project});
                });
                break;
            }
            case 'play': {
                play();
                break;
            }
            case 'stop': {
                stop();
                break;
            }
            case 'test': {
                var output = new midi.output();
                output.openPort(0);
                output.sendMessage([144, 60, 100]);
                setTimeout(function (output) {
                    output.sendMessage([128, 60, 0]);
                }, 1000, output);
            }
        }
    });

    var project = {};
    var outputs = [];
    var timer = null;
    var interval = 0;
    var isPlaying = false;
    var playheadPosition = 0;

    // project methods
    function load(next) {
        fs.readFile('./data/example.json', 'utf-8', function (err, data) {
            if (err) {
                return next(err);
            }

            // set project data
            project = JSON.parse(data);
            outputs = [];

            // set-up midi tracks
            _.each(project.tracks, function(track, index){
                outputs[track.port] = new midi.output();
                outputs[track.port].openPort(track.port);
            });

            if (next) {
                next(null, data);
            }
        });
    }

    // midi note methods
    function noteOn(note, velocity, port){
        outputs[port].sendMessage([144, note, velocity]);
    }

    function noteOff(note, port){
        outputs[port].sendMessage([128, note, 0]);
    }

    function note(message){
        var duration = message[3];
        duration *= parseInt(interval);
        noteOn(message[1], message[2], message[4]);
        new nanotimer().setTimeout(function(note, port){
            noteOff(note, port);
        }, [message[1], message[4]], duration + 'm');
    }

    // control methods
    function setPlayheadPosition(value){
        playheadPosition = value;
        window.remote({action: 'playheadPositionUpdated', message: playheadPosition});
    }

    function play() {
        isPlaying = true;
        // tickHandler
        function tickHandler(){
            _.each(project.tracks, function(track){
                var clip = track.clips[0];
                var events = clip.events[playheadPosition%clip.length];
                _.each(events, function(event){
                    switch (event[0]){
                        case 'note':
                            // ["note", 60, 100, 1]
                            note(event.concat(track.port));
                            break;
                    }
                });
            });
            setPlayheadPosition(playheadPosition+1);
        }

        // set-up clock
        interval = (15000/project.bpm).toString()+'m';
        timer = new nanotimer();
        timer.setInterval(tickHandler, '', interval);
    }

    function stop() {
        if (isPlaying){
            // stop
            isPlaying = false;
            timer.clearInterval();
        }
        else {
            // reset playhead position
            setPlayheadPosition(0);
        }
    }

    load();

    // REST API
    /*
     var http = require('http');
     http.createServer(function (req, res) {
     res.writeHead(200, {'Content-Type': 'text/plain'});
     res.end('Hello World\n');
     }).listen(1337, '127.0.0.1');
     */
});