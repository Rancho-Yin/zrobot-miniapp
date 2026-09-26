const store = require('../../utils/store');
const ai = require('../../utils/ai');
Page({
  data: { work: {}, title: '', subtitle: '', versions: [], busy: false, follow: '' },
  onLoad(q) {
    const w = store.getWork(q.id);
    if (!w) { wx.switchTab({ url: '/pages/gallery/gallery' }); return; }
    this.setData({ work: w, id: w.id, title: w.title, subtitle: w.subtitle || '', versions: w.versions || [] });
  },
  editTitle(e) { this.setData({ title: e.detail.value }); },
  editSub(e) { this.setData({ subtitle: e.detail.value }); },
  onFollow(e) { this.setData({ follow: e.detail.value }); },
  save() {
    const w = store.updateWork(this.data.id, { title: this.data.title, subtitle: this.data.subtitle });
    if (w) { const vs = w.versions || []; wx.showToast({ title: '已保存新版本', icon: 'success' }); this.setData({ versions: vs, work: w }); }
  },
  publish() {
    const w = store.updateWork(this.data.id, { title: this.data.title, subtitle: this.data.subtitle });
    if (w) { store.setCurrent(w); wx.switchTab({ url: '/pages/home/home' }); }
  },
  ask() {
    const text = (this.data.follow || '').trim();
    if (!text || this.data.busy) return;
    if (!store.spend(2)) { wx.showModal({ title: '积分不足', content: '生成需要 2 积分，去「我的」充值。', confirmText: '去充值', success: r => { if (r.confirm) wx.switchTab({ url: '/pages/profile/profile' }); } }); return; }
    this.setData({ busy: true });
    wx.showLoading({ title: '正在生成真实画面…', mask: true });
    const prompt = [this.data.title, this.data.subtitle, text].filter(Boolean).join('。');
    ai.generate(prompt).then(url => {
      wx.hideLoading();
      if (!url) { store.refund(2); this.setData({ busy: false, follow: '' }); wx.showModal({ title: 'AI 服务未连接', content: '已退回 2 积分，稍后重试。', showCancel: false }); return; }
      const w = store.updateWork(this.data.id, { imageUrl: url, versions: (this.data.versions.concat([{ note: text, date: '刚刚' }])) });
      this.setData({ busy: false, follow: '', work: w || this.data.work, versions: w ? w.versions : this.data.versions });
      wx.showToast({ title: '已生成真实画面', icon: 'success' });
    });
  }
});
