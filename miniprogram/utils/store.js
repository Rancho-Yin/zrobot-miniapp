const CFG = require('./config');
const K = { works: 'zw:works', current: 'zw:current', credits: 'zw:credits', onboard: 'zw:onboard', user: 'zw:user' };
const SEEDS = [
  { id: 'seed-coffee', title: '门店实拍 · 手冲咖啡', type: 'image', url: CFG.PHOTO.coffee, tag: '图片', scene: '自由创作', date: '9/25' },
  { id: 'seed-event', title: '新品发布 · 门店现场', type: 'image', url: CFG.PHOTO.eventReal, tag: '图片', scene: '自由创作', date: '9/24' },
  { id: 'seed-video', title: '自然瞬间 · 氛围视频', type: 'video', url: CFG.VIDEO, tag: '视频', scene: '自由创作', date: '9/23' }
];
function read(k, def) { try { const v = wx.getStorageSync(k); return (v === '' || v === null || v === undefined) ? def : v; } catch (e) { return def; } }
function write(k, v) { try { wx.setStorageSync(k, v); } catch (e) {} }
let seq = Date.now();
function init() { const w = read(K.works, null); if (!w || !w.length) write(K.works, SEEDS); }
function getWorks() { return read(K.works, SEEDS.slice()); }
function getWork(id) { return getWorks().find(x => x.id === id) || null; }
function addWork(w) { const list = getWorks(); w.id = 'w' + (seq++); w.date = (new Date().getMonth() + 1) + '/' + new Date().getDate(); w.tag = w.type === 'video' ? '视频' : '图片'; w.scene = w.scene || '自由创作'; list.unshift(w); saveWorks(list); return w; }
function updateWork(id, patch) { const list = getWorks(); const i = list.findIndex(x => x.id === id); if (i > -1) { list[i] = Object.assign({}, list[i], patch); saveWorks(list); return list[i]; } return null; }
function removeWork(id) { saveWorks(getWorks().filter(x => x.id !== id)); }
function restore(w) { const list = getWorks(); list.unshift(w); saveWorks(list); }
function getCurrent() { return read(K.current, null); }
function setCurrent(w) { write(K.current, w ? { id: w.id, title: w.title, imageUrl: w.imageUrl || w.url || '', type: w.type } : null); }
function getCredits() { return read(K.credits, 20); }
function setCredits(v) { write(K.credits, v); }
function spend(n) { const b = getCredits(); if (b < n) return false; setCredits(b - n); return true; }
function refund(n) { setCredits(getCredits() + n); }
function getUser() { return read(K.user, null); }
function setUser(u) { write(K.user, u); }
function getOnboard() { return read(K.onboard, {}); }
function setOnboard(d) { write(K.onboard, d); }
function saveWorks(list) { write(K.works, list); }
module.exports = { init, getWorks, getWork, addWork, updateWork, removeWork, restore, getCurrent, setCurrent, getCredits, setCredits, spend, refund, getUser, setUser, getOnboard, setOnboard };
