const store = require('../../utils/store');
Page({
  data: { works: [], filter: 'all', query: '', undo: null },
  onShow() { this.refresh(); },
  refresh() {
    const list = store.getWorks().filter(w => (this.data.filter === 'all' || w.type === this.data.filter) && (w.title || '').toLowerCase().indexOf(this.data.query.toLowerCase()) > -1);
    this.setData({ works: list });
  },
  setFilter(e) { this.setData({ filter: e.currentTarget.dataset.v }); this.refresh(); },
  onSearch(e) { this.setData({ query: e.detail.value }); this.refresh(); },
  tapWork(e) {
    const id = e.currentTarget.dataset.id;
    const w = store.getWork(id);
    if (!w) return;
    wx.showActionSheet({
      itemList: ['上屏演示', '编辑内容', '重命名', '删除'],
      success: (r) => {
        if (r.tapIndex === 0) { store.setCurrent(w); wx.switchTab({ url: '/pages/home/home' }); }
        if (r.tapIndex === 1) wx.navigateTo({ url: '/pages/studio/studio?id=' + id });
        if (r.tapIndex === 2) this.rename(id);
        if (r.tapIndex === 3) this.remove(id);
      }
    });
  },
  rename(id) {
    wx.showModal({
      title: '重命名', editable: true, placeholderText: '输入新名称',
      success: r => { if (r.confirm && r.content) { store.updateWork(id, { title: r.content }); this.refresh(); } }
    });
  },
  remove(id) {
    const w = store.getWork(id);
    if (!w) return;
    store.removeWork(id);
    this.refresh();
    this.setData({ undo: { work: w } });
    clearTimeout(this._t);
    this._t = setTimeout(() => this.setData({ undo: null }), 5000);
  },
  undo() {
    const u = this.data.undo;
    if (u && u.work) { store.restore(u.work); this.refresh(); }
    this.setData({ undo: null });
  }
});
