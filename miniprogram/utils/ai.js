const CFG = require('./config');
function generate(prompt) {
  return new Promise((resolve) => {
    wx.request({
      url: CFG.API_BASE + '/api/generate',
      method: 'POST',
      data: { prompt: String(prompt || '').slice(0, 600), size: '1024x1024' },
      timeout: 60000,
      success(r) { resolve(r.data && r.data.imageUrl ? r.data.imageUrl : null); },
      fail() { resolve(null); }
    });
  });
}
module.exports = { generate };
