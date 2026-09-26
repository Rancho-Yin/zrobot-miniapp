const store = require('../../utils/store');
Page({
  data: { cur: {}, playing: true, narrating: false, messages: [], input: '', credits: 0, card: null },
  onShow() { this.refresh(); },
  refresh() {
    const d = getApp().globalData.device;
    const cur = store.getCurrent();
    this.setData({
      cur: cur || { title: '品牌产品介绍', imageUrl: require('../../utils/config').PHOTO.product },
      playing: d.playing, narrating: d.narrating, credits: store.getCredits(),
      messages: this.data.messages
    });
  },
  goLibrary() { wx.switchTab({ url: '/pages/library/library' }); },
  goTerminal() { wx.navigateTo({ url: '/pages/terminal/terminal' }); },
  goCreate() { wx.navigateTo({ url: '/pages/create/create' }); },
  toggleNarrate() {
    const d = getApp().globalData.device;
    d.narrating = !d.narrating; if (d.narrating) d.playing = true;
    this.setData({ narrating: d.narrating });
    wx.showToast({ title: d.narrating ? '数字人开始讲解' : '已结束讲解', icon: 'none' });
  },
  onInput(e) { this.setData({ input: e.detail.value }); },
  onMic() { wx.showToast({ title: '按住说话（真机语音演示）', icon: 'none' }); },
  onSend() {
    const text = (this.data.input || '').trim();
    if (!text) return;
    const msgs = this.data.messages.concat([{ role: 'user', text }]);
    this.setData({ messages: msgs, input: '' });
    if (!store.spend(1)) {
      wx.showModal({ title: '积分不足', content: '助手对话需要 1 积分，去「我的」充值。', confirmText: '去充值', success: r => { if (r.confirm) wx.switchTab({ url: '/pages/profile/profile' }); } });
      return;
    }
    const reply = this.act(text);
    setTimeout(() => {
      const d = getApp().globalData.device;
      const card = { title: (store.getCurrent() || {}).title || stateTitle(), playing: d.playing, narrating: d.narrating, chapter: d.chapter, chapters: d.chapters, volume: d.volume };
      this.setData({ messages: this.data.messages.concat([{ role: 'assistant', text: reply.text, card }]) });
    }, 350);
  },
  act(t) {
    const d = getApp().globalData.device;
    const has = (...ws) => ws.some(w => t.indexOf(w) > -1);
    if (has('结束讲解', '关闭讲解')) return { text: '已结束讲解。', run: () => { d.narrating = false; this.setData({ narrating: false }); } };
    if (has('讲解', '解说')) return { text: '好的，已进入讲解模式，我为你讲述当前画面。', run: () => { d.narrating = true; d.playing = true; this.setData({ narrating: true }); } };
    if (has('暂停')) return { text: '已暂停播放。', run: () => { d.playing = false; this.setData({ playing: false }); } };
    if (has('继续', '播放')) return { text: '继续播放。', run: () => { d.playing = true; this.setData({ playing: true }); } };
    if (has('下一', '换个')) return { text: '已切换到下一章节。', run: () => { d.chapter = Math.min(d.chapters, d.chapter + 1); } };
    if (has('上一')) return { text: '已切换到上一章节。', run: () => { d.chapter = Math.max(1, d.chapter - 1); } };
    if (has('音量')) { const up = has('大', '高'); return { text: up ? '已调大音量。' : '已调小音量。', run: () => { d.volume = Math.max(0, Math.min(100, d.volume + (up ? 20 : -20))); } }; }
    if (has('积分', '余额')) return { text: '当前剩余 ' + store.getCredits() + ' 积分。生成画面 2 积分/次，屏幕助手 1 积分/次，充值在「我的」页面。' };
    if (has('换内容', '更换')) return { text: '为你打开内容库，选一条内容即可替换上屏。', run: () => wx.switchTab({ url: '/pages/library/library' }) };
    if (has('帮助', '能做什么')) return { text: '你可以试试：开始讲解、暂停播放、下一章节、音量小一点、查看积分、更换内容。' };
    return { text: '收到。你可以让我：开始讲解、暂停播放、切换章节、调节音量、查看积分或更换内容。' };
  }
});
function stateTitle() { return '当前画面'; }
