const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const nanotimer = require('nanotimer');
const _ = require('lodash');
const midi = require('midi');

let win = null;
let project = {};
let outputs = [];
let timer = null;
let interval = 0;
let isPlaying = false;
let playheadPosition = 0;

function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile(path.join(__dirname, 'html', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  load();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('action', (event, msg) => {
  switch (msg.action) {
    case 'load':
      load(err => {
        if (!err) {
          win.webContents.send('projectLoaded', project);
        }
      });
      break;
    case 'play':
      play();
      break;
    case 'stop':
      stop();
      break;
  }
});

function load(next) {
  fs.readFile(path.join(__dirname, 'data', 'example.json'), 'utf-8', (err, data) => {
    if (err) {
      if (next) next(err);
      return;
    }
    project = JSON.parse(data);
    outputs = [];
    _.each(project.tracks, track => {
      outputs[track.port] = new midi.output();
      outputs[track.port].openPort(track.port);
    });
    if (next) next(null, data);
  });
}

function noteOn(note, velocity, port) {
  outputs[port].sendMessage([144, note, velocity]);
}

function noteOff(note, port) {
  outputs[port].sendMessage([128, note, 0]);
}

function note(message) {
  let duration = message[3];
  duration *= parseInt(interval);
  noteOn(message[1], message[2], message[4]);
  new nanotimer().setTimeout((n, p) => {
    noteOff(n, p);
  }, [message[1], message[4]], duration + 'm');
}

function setPlayheadPosition(value) {
  playheadPosition = value;
  if (win) {
    win.webContents.send('playheadPositionUpdated', playheadPosition);
  }
}

function play() {
  isPlaying = true;
  function tickHandler() {
    _.each(project.tracks, track => {
      const clip = track.clips[0];
      const events = clip.events[playheadPosition % clip.length];
      _.each(events, event => {
        switch (event[0]) {
          case 'note':
            note(event.concat(track.port));
            break;
        }
      });
    });
    setPlayheadPosition(playheadPosition + 1);
  }
  interval = (15000 / project.bpm).toString() + 'm';
  timer = new nanotimer();
  timer.setInterval(tickHandler, '', interval);
}

function stop() {
  if (isPlaying) {
    isPlaying = false;
    timer.clearInterval();
  } else {
    setPlayheadPosition(0);
  }
}
