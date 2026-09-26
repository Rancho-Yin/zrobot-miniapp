const CDN = 'https://rancho-yin.github.io/zrobot-miniapp/assets/';
module.exports.THEMES = [
  { id: 'tpl-product', title: '让产品成为主角', img: CDN + 'scene-gallery.jpg', prompt: '为「产品介绍」生成一张宣传画面。产品名称：[替换成产品名]；核心卖点：[一句话卖点]；产品在简约展台陈列，标题突出产品名称，风格简约克制。' },
  { id: 'tpl-launch', title: '新品，值得被看见', img: CDN + 'scene-studio.jpg', prompt: '为「新品发布」生成一张发布主视觉。新品名称：[替换]；最大亮点：[一句话]；纯色空间聚焦产品，使用醒目的品牌色，风格鲜明。' },
  { id: 'tpl-welcome', title: '欢迎每一次相遇', img: CDN + 'scene-nature.jpg', prompt: '为「欢迎接待」生成一张欢迎画面。欢迎对象：[来访嘉宾或活动名称]；欢迎语：[替换]；信息清晰简洁，传递热情与专业，风格简约。' },
  { id: 'tpl-event', title: '好时光，即将开始', img: CDN + 'scene-kitchen.jpg', prompt: '为「活动预告」生成一张预告画面。活动主题：[替换]；时间地点：[替换]；暖光氛围营造好时光即将开始的感觉，风格温暖。' }
];
module.exports.CHIPS = [
  ['产品介绍', '介绍这款产品的核心卖点与使用场景'],
  ['活动通知', '宣布本周末的会员活动，突出时间与地点'],
  ['欢迎接待', '欢迎来访嘉宾，传递热情与专业'],
  ['艺术氛围', '生成一张纯净的艺术氛围画面']
];
module.exports = {
  API_BASE: 'https://zrobot-miniapp.vercel.app',
  CDN,
  PHOTO: {
    product: CDN + 'scene-gallery.jpg',
    launch: CDN + 'scene-studio.jpg',
    welcome: CDN + 'scene-nature.jpg',
    event: CDN + 'scene-kitchen.jpg',
    coffee: CDN + 'sample-coffee.jpg',
    eventReal: CDN + 'sample-event.jpg'
  },
  VIDEO: CDN + 'sample-video.mp4',
  COST_GENERATE: 2,
  COST_CHAT: 1
};
