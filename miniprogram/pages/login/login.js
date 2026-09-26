const store = require('../../utils/store');
Page({
  data: {},
  deny() { wx.showToast({ title: '已取消登录', icon: 'none' }); wx.switchTab({ url: '/pages/home/home' }); },
  allow() {
    const btn = this;
    wx.login({ success() {
      wx.getUserProfile({
        desc: '用于展示个人资料',
        success(u) { store.setUser({ name: u.userInfo.nickName || '微信用户', avatar: u.userInfo.avatarUrl }); btn.after(); },
        fail() { store.setUser({ name: '微信用户' }); btn.after(); }
      });
    }, fail() { store.setUser({ name: '微信用户' }); btn.after(); } });
  },
  after() {
    wx.showToast({ title: '登录成功', icon: 'success' });
    const ob = store.getOnboard();
    if (!ob.welcomed) { ob.welcomed = true; store.setOnboard(ob); setTimeout(() => { wx.showModal({ title: '欢迎 👋', content: '① 一句话生成画面 ② 一键上屏 ③ 说话即控制。去「创作」试试你的第一次生成吧！', confirmText: '去创作', showCancel: false, success: () => wx.switchTab({ url: '/pages/gallery/gallery' }) }); }, 400); }
    else setTimeout(() => wx.switchTab({ url: '/pages/gallery/gallery' }), 400);
  }
});
