const store = require('../../utils/store');
Page({
  data: { works: [], obText: '', credits: 0 },
  onShow() { this.refresh(); },
  refresh() {
    const ob = store.getOnboard();
    const done = !!ob.done;
    const steps = [['gen', '生成画面'], ['prev', '预览效果'], ['pub', '上屏演示']];
    const n = steps.filter(s => ob[s[0]]).length;
    const works = store.getWorks().map(w => Object.assign({}, w, { cover: w.imageUrl || w.url, versions: w.versions ? w.versions.length : 0 }));
    this.setData({ works, credits: store.getCredits(), obText: done ? '' : ('新手引导 ' + n + '/3 · ' + steps.filter(s => !ob[s[0]]).map(s => s[1]).join(' → ')) });
  },
  openWork(e) { wx.navigateTo({ url: '/pages/studio/studio?id=' + e.currentTarget.dataset.id }); },
  goCreate() { wx.navigateTo({ url: '/pages/create/create' }); }
});
