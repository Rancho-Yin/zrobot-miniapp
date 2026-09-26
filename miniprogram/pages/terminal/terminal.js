const store = require('../../utils/store');
Page({
  data: { cur: {}, playing: true, chapter: 1, chapters: 3, volume: 62, narrating: false },
  onShow() {
    const d = getApp().globalData.device;
    this.setData({ cur: store.getCurrent() || {}, playing: d.playing, chapter: d.chapter, chapters: d.chapters, volume: d.volume, narrating: d.narrating });
  },
  toggle() { const d = getApp().globalData.device; d.playing = !d.playing; this.setData({ playing: d.playing }); },
  prev() { const d = getApp().globalData.device; d.chapter = Math.max(1, d.chapter - 1); this.sync(d); },
  next() { const d = getApp().globalData.device; d.chapter = Math.min(d.chapters, d.chapter + 1); this.sync(d); },
  vol(e) { const d = getApp().globalData.device; d.volume = Number(e.detail.value); this.setData({ volume: d.volume }); },
  narrate() { const d = getApp().globalData.device; d.narrating = !d.narrating; this.setData({ narrating: d.narrating }); },
  sync(d) { this.setData({ chapter: d.chapter }); }
});
