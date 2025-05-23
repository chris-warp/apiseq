const { ipcRenderer } = require('electron');
const { useState, useEffect, useRef } = React;

function Clip({ clip, playheadPosition, zoomX, zoomY }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!clip) return;
    const notes = ['C', 'C#', 'D', 'Eb', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
    const semi = [1, 3, 6, 8, 10];
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const cell = { width: 50 * zoomX, height: 20 * zoomY };
    canvas.width = clip.length * cell.width;
    canvas.height = 128 * cell.height;
    for (let row = 0; row < 127; row++) {
      context.fillStyle = '#fff';
      context.font = 'normal 10px Maven Pro';
      context.fillText(notes[row % notes.length], 0, (127 - row) * cell.height + 12);
      for (let col = 0; col < clip.length; col++) {
        const isColActive = col === playheadPosition % clip.length;
        context.beginPath();
        context.rect((col + 1) * cell.width, (127 - row) * cell.height, cell.width - 1, cell.height - 1);
        context.fillStyle = semi.includes(row % 12) ? (isColActive ? '#bbb' : '#ccc') : (isColActive ? '#ddd' : '#fff');
        context.fill();
      }
    }
    clip.events.forEach((items, col) => {
      const isColActive = col === playheadPosition % clip.length;
      items.forEach(event => {
        context.beginPath();
        context.rect((col + 1) * cell.width, (127 - event[1]) * cell.height, cell.width - 1, cell.height - 1);
        context.fillStyle = isColActive ? '#3f3' : '#f33';
        context.fill();
      });
    });
  }, [clip, playheadPosition, zoomX, zoomY]);

  return React.createElement('div', { className: 'scroller' },
    React.createElement('canvas', { ref: canvasRef, className: 'roll' })
  );
}

function App() {
  const [project, setProject] = useState({ bpm: 120, tracks: [] });
  const [selectedClip, setSelectedClip] = useState(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomX, setZoomX] = useState(1);
  const [zoomY, setZoomY] = useState(1);

  useEffect(() => {
    const onProjectLoaded = (_e, p) => setProject(p);
    const onPlayhead = (_e, pos) => setPlayheadPosition(pos);
    ipcRenderer.on('projectLoaded', onProjectLoaded);
    ipcRenderer.on('playheadPositionUpdated', onPlayhead);
    ipcRenderer.send('action', { action: 'load' });
    return () => {
      ipcRenderer.removeListener('projectLoaded', onProjectLoaded);
      ipcRenderer.removeListener('playheadPositionUpdated', onPlayhead);
    };
  }, []);

  const play = () => {
    if (isPlaying) return;
    ipcRenderer.send('action', { action: 'play' });
    setIsPlaying(true);
  };

  const stop = () => {
    ipcRenderer.send('action', { action: 'stop' });
    setIsPlaying(false);
  };

  const addTrack = () => {
    setProject(p => ({ ...p, tracks: [...p.tracks, { clips: [{ events: [], length: 8 }], port: 0 }] }));
  };

  const selectClip = clip => setSelectedClip(clip);

  return (
    React.createElement('div', null,
      React.createElement('div', { className: 'area' },
        React.createElement('h1', null, 'control'),
        React.createElement('button', { className: 'btn btn-default', onClick: play },
          React.createElement('i', { className: 'glyphicon glyphicon-play' })),
        React.createElement('button', { className: 'btn btn-default', onClick: stop },
          React.createElement('i', { className: 'glyphicon glyphicon-stop' })),
        React.createElement('div', { className: 'btn btn-default numbers' },
          React.createElement('span', { className: 'large' }, Math.floor(playheadPosition / 16) + 1),
          React.createElement('span', { className: 'separator' }, ':'),
          React.createElement('span', null, Math.floor((playheadPosition % 16) / 4) + 1),
          React.createElement('span', { className: 'separator' }, ':'),
          React.createElement('span', null, (playheadPosition % 4) + 1)),
        React.createElement('div', { className: 'btn btn-default' }, project.bpm + ' bpm')
      ),
      React.createElement('div', { className: 'area' },
        React.createElement('h1', null, 'tracks'),
        React.createElement('ul', { className: 'tracks' },
          project.tracks.map((track, tIndex) =>
            React.createElement('li', { key: tIndex },
              React.createElement('input', {
                type: 'text',
                value: track.port,
                onChange: e => setProject(p => {
                  const tracks = [...p.tracks];
                  tracks[tIndex].port = parseInt(e.target.value, 10);
                  return { ...p, tracks };
                })
              }),
              React.createElement('ul', { className: 'clips' },
                track.clips.map((clip, cIndex) =>
                  React.createElement('li', {
                    key: cIndex,
                    onClick: () => selectClip(clip),
                    className: selectedClip === clip ? 'active' : ''
                  },
                    React.createElement('a', null,
                      React.createElement('i', { className: 'glyphicon glyphicon-play' })))
                )
              ),
              React.createElement('a', { className: 'btn btn-default btn-block', onClick: () => { } },
                React.createElement('i', { className: 'glyphicon glyphicon-plus' }))
            )
          )
        ),
        React.createElement('div', { className: 'btn btn-default', onClick: addTrack }, 'add')
      ),
      React.createElement('div', { className: 'area' },
        React.createElement('h1', null, 'clip'),
        React.createElement('div', { className: 'row' },
          React.createElement('div', { className: 'col-xs-2' },
            React.createElement('input', { type: 'range', min: 0.1, max: 5, step: 0.1, value: zoomX, onChange: e => setZoomX(parseFloat(e.target.value)) })),
          React.createElement('div', { className: 'col-xs-2' },
            React.createElement('input', { type: 'range', min: 0.1, max: 5, step: 0.1, value: zoomY, onChange: e => setZoomY(parseFloat(e.target.value)) }))
        ),
        selectedClip && React.createElement(Clip, { clip: selectedClip, playheadPosition, zoomX, zoomY })
      )
    )
  );
}

ReactDOM.render(React.createElement(App), document.getElementById('app'));
