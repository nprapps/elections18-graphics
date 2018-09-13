import { h, createProjector } from 'maquette';
import request from 'superagent';
import { buildDataURL } from './helpers.js';

var dataURL;
var lastRequestTime;
var data;
var initialized = false;

const projector = createProjector();

function renderGetCaughtUp () {
  const wrapper = document.querySelector('.get-caught-up-wrapper');
  projector.replace(wrapper, renderMaquette);

  if (!initialized) {
    initialized = true;
    dataURL = buildDataURL('get-caught-up.json');
    getData();
    // This `setInterval` will persist across re-renderings
    setInterval(getData, 5000);
  }
}

const getData = function () {
  request.get(dataURL)
    .set('If-Modified-Since', lastRequestTime)
    .end(function (err, res) {
      // Superagent takes anything outside of `200`-class responses to be errors
      if (err && ((res && res.statusCode !== 304) || !res)) { throw err; }
      if (res.body) {
        lastRequestTime = new Date().toUTCString();
        data = res.body.content;
        projector.scheduleRender();
      }
    });
};

function renderMaquette () {
  const INTRO_KEY_PREFIX = 'intro_';
  const BULLET_KEY_PREFIX = 'bullet_';

  if (!data) {
    return h('div.get-caught-up-wrapper', 'Loading...');
  } else {
    setTimeout(pymChild.sendHeight, 0);

    return h('div.get-caught-up-wrapper', [
      h('h2', 'Get Caught Up'),

      // Render intro paragraphs
      ...Object.keys(data)
        .filter(k => k.startsWith(INTRO_KEY_PREFIX))
        .filter(k => data[k] !== '')
        .map(k => h('p', { key: k, innerHTML: data[k] })),

      // Render bullet points
      h(
        'ul',
        Object.keys(data)
          .filter(k => k.startsWith(BULLET_KEY_PREFIX))
          .filter(k => data[k] !== '')
          .map(k => h('li', { key: k, innerHTML: data[k] }))
      )
    ]);
  }
}

export {
  renderGetCaughtUp
};
