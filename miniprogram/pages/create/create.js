const store = require('../../utils/store');
const ai = require('../../utils/ai');
const CFG = require('../../utils/config');
Page({
  data: { tab: 'free', input: '', credits: 0, themes: [], chips: [], busy: false },
  onLoad() {
    this.setData({
      credits: store.getCredits(),
      themes: CFG.THEMES.map(t => Object.assign({}, t, { img: t.img })),
      chips: CFG.CHIPS.map(c => ({ name: c[0], text: c[1] }))
    });
  },
  onShow() { this.setData({ credits: store.getCredits() }); },
  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.value }); },
  onInput(e) { this.setData({ input: e.detail.value }); },
  useChip(e) { this.setData({ input: e.currentTarget.dataset.text }); },
  useTheme(e) {
    const t = this.data.themes.find(x => x.id === e.currentTarget.dataset.id);
    if (t) this.setData({ input: t.prompt });
  },
  upload() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (r) => {
      const f = r.tempFiles[0];
      store.addWork({ title: '导入素材', type: 'image', url: f.tempFilePath, imageUrl: f.tempFilePath });
      wx.showToast({ title: '已存入内容库', icon: 'success' });
    } });
  },
  mic() { wx.showToast({ title: '语音输入请按住说话（演示）', icon: 'none' }); },
  send() {
    const text = (this.data.input || '').trim();
    if (!text) { wx.showToast({ title: '先描述你想生成的画面', icon: 'none' }); return; }
    if (!store.spend(CFG.COST_GENERATE)) {
      wx.showModal({ title: '积分不足', content: '生成画面需要 ' + CFG.COST_GENERATE + ' 积分，去「我的」充值后再试。', confirmText: '去充值', success: r => { if (r.confirm) wx.switchTab({ url: '/pages/profile/profile' }); } });
      return;
    }
    const title = text.split(/[。；;！!？?\n]/)[0].trim().slice(0, 18) || '未命名作品';
    this.setData({ busy: true });
    wx.showLoading({ title: '正在生成真实画面…', mask: true });
    ai.generate(text).then(url => {
      wx.hideLoading();
      if (!url) {
        store.refund(CFG.COST_GENERATE);
        this.setData({ busy: false });
        wx.showModal({ title: 'AI 服务未连接', content: '已退回 ' + CFG.COST_GENERATE + ' 积分，可稍后重试或先浏览模板。', showCancel: false });
        return;
      }
      const w = store.addWork({ title, type: 'image', imageUrl: url, versions: [{ note: text, date: '刚刚' }] });
      this.setData({ busy: false, input: '' });
      wx.navigateTo({ url: '/pages/studio/studio?id=' + w.id });
    });
  }
});
