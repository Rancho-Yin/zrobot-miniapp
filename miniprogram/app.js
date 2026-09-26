const store = require('./utils/store');
App({
  globalData: {
    device: { playing: true, narrating: false, chapter: 1, chapters: 3, volume: 62 }
  },
  onLaunch() { store.init(); }
});
