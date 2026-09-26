const store = require('../../utils/store');
Page({
  data: { name: '本地体验用户', logged: false, credits: 0, count: 0 },
  onShow() {
    const u = store.getUser();
    this.setData({ name: (u && u.name) || '本地体验用户', logged: !!u, credits: store.getCredits(), count: store.getWorks().length });
  },
  goLogin() { if (!this.data.logged) wx.navigateTo({ url: '/pages/login/login' }); },
  goHome() { wx.switchTab({ url: '/pages/home/home' }); },
  goLibrary() { wx.switchTab({ url: '/pages/library/library' }); },
  bind() { wx.showToast({ title: '正式版将调用微信扫码绑定', icon: 'none' }); },
  help() { wx.showModal({ title: '使用帮助', content: '从内容到屏幕：创作生成 → 内容库管理 → 一键上屏 → 现场遥控讲解。有问题随时联系客服。', showCancel: false }); },
  recharge() {
    wx.showActionSheet({
      itemList: ['60 积分 ¥6', '400 积分 ¥30', '1000 积分 ¥68'],
      success: r => {
        const amounts = [60, 400, 1000];
        store.setCredits(store.getCredits() + amounts[r.tapIndex]);
        this.setData({ credits: store.getCredits() });
        wx.showToast({ title: '充值成功', icon: 'success' });
      }
    });
  }
});
