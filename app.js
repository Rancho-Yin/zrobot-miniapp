const appContent = document.getElementById('appContent');
const modalLayer = document.getElementById('modalLayer');
const toast = document.getElementById('toast');

const params = new URLSearchParams(location.search);
const state = {
  route: params.get('login') === 'wechat' ? 'wechat-login' : (['studio','gallery','library','home','profile','project-history','wechat-login'].includes(params.get('view')) ? params.get('view') : 'library'),
  terminalOnline: true,
  playing: true,
  narrating: false,
  selectedTemplate: 'product',
  digitalHuman: true,
  title: '让未来，由此展开',
  subtitle: '智显机器人 · AI内容即刻上屏',
  previewSource: 'studio',
  volume: 62,
  chapter: 1,
  chapters: 3,
  quickstartStage: 'input',
  quickstartUploaded: false,
  quickstartPrompt: '',
};

const escapeHTML = (value = '') => value.replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

const Credits = {
  KEY: 'zrobot-credits-v1',
  get() { const raw = localStorage.getItem(this.KEY); if (raw === null) return 20; const v = Number(raw); return Number.isFinite(v) ? v : 20; },
  set(v) { try { localStorage.setItem(this.KEY, String(v)); } catch (_) {} },
  spend(n, reason) {
    const balance = this.get();
    if (balance < n) {
      openSheet(`<h2>积分不足</h2><p>${escapeHTML(reason || '本次操作')}需要 ${n} 积分，当前余额 ${balance}。积分用于 AI 生成画面与屏幕助手对话，可在「我的」页面充值。</p><div class="button-row"><button class="secondary-button" type="button" data-action="cancel-sheet">取消</button><button class="ch-primary" type="button" data-action="go-recharge">去充值</button></div>`);
      return false;
    }
    this.set(balance - n);
    showToast(`-${n} 积分 · 剩余 ${this.get()}`);
    return true;
  }
};

const assistantMessages = [];
let orbOpen = false;
const orbLayer = document.createElement('div');
orbLayer.className = 'orb-layer';
orbLayer.id = 'orbLayer';
orbLayer.hidden = true;
document.querySelector('.phone').append(orbLayer);
function renderOrb() {
  orbLayer.hidden = !orbOpen;
  if (!orbOpen) { orbLayer.innerHTML = ''; return; }
  orbLayer.innerHTML = `<div class="orb"></div><p class="orb-status">${state.narrating ? '讲解模式 · 正在为你讲述画面内容' : '语音模式 · 请说出你的指令'}</p><div class="orb-bar"><input id="orbInput" placeholder="输入或说出指令…" aria-label="输入指令"/><button class="orb-mic" type="button" data-action="orb-voice" aria-label="语音输入"><i data-lucide="mic"></i></button><button class="orb-close" type="button" data-action="orb-close" aria-label="关闭语音模式"><i data-lucide="x"></i></button></div>`;
  lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
}
function openOrb() { orbOpen = true; renderOrb(); }
function closeOrb() { orbOpen = false; renderOrb(); }
function assistantAct(t) {
  const has = (...ws) => ws.some(w => t.includes(w));
  if (has('结束讲解', '关闭讲解', '停止讲解')) return { text: '已结束讲解。', card: true, run: () => { state.narrating = false; closeOrb(); render(); } };
  if (has('讲解', '解说', '语音播报')) return { text: '好的，已进入讲解模式，我为你讲述当前画面。', card: true, run: () => { state.narrating = true; state.playing = true; render(); openOrb(); } };
  if (has('暂停')) return { text: '已暂停播放。', card: true, run: () => { state.playing = false; render(); } };
  if (has('继续播放', '开始播放', '继续', '播放')) return { text: '继续播放。', card: true, run: () => { state.playing = true; render(); } };
  if (has('下一', '换个')) return { text: '已切换到下一章节。', card: true, run: () => { state.chapter = Math.min(state.chapters, state.chapter + 1); render(); } };
  if (has('上一')) return { text: '已切换到上一章节。', card: true, run: () => { state.chapter = Math.max(1, state.chapter - 1); render(); } };
  if (has('音量')) { const up = has('大', '高'); return { text: up ? '已调大音量。' : '已调小音量。', card: true, run: () => { state.volume = Math.max(0, Math.min(100, state.volume + (up ? 20 : -20))); render(); } }; }
  if (has('积分', '余额', '还剩')) return { text: `当前剩余 ${Credits.get()} 积分。生成画面消耗 2 积分/次，屏幕助手 1 积分/次，充值在「我的」页面。` };
  if (has('换内容', '更换', '换画面', '上屏')) return { text: '为你打开内容库，选一条内容即可替换上屏。', run: () => navigate('library') };
  if (has('帮助', '能做什么', '怎么用')) return { text: '你可以试试：开始讲解、暂停播放、下一章节、音量小一点、查看积分、更换内容。' };
  return { text: '收到。你可以让我：开始讲解、暂停播放、切换章节、调节音量、查看积分或更换内容。' };
}
function handleAssistant(raw) {
  const text = String(raw || '').trim();
  if (!text) return;
  assistantMessages.push({ role: 'user', text });
  if (state.route === 'home') render();
  if (!Credits.spend(1, '屏幕助手对话')) return;
  const reply = assistantAct(text);
  setTimeout(() => {
    reply.run?.();
    const msg = { role: 'assistant', text: reply.text };
    if (reply.card) msg.card = screenStatus();
    assistantMessages.push(msg);
    if (state.route === 'home') { render(); appContent.scrollTop = appContent.scrollHeight; }
  }, 480);
}
window.Credits = Credits;
const Onboard = {
  data() { try { return JSON.parse(localStorage.getItem('zrobot-onboard')) || {}; } catch (_) { return {}; } },
  mark(step) {
    try {
      const d = { ...this.data(), [step]: true };
      if (step === 'pub') d.prev = true;
      localStorage.setItem('zrobot-onboard', JSON.stringify(d));
      if (!d.done && d.gen && d.prev && d.pub) {
        d.done = true;
        localStorage.setItem('zrobot-onboard', JSON.stringify(d));
        openSheet(`<div class="success-mark"><i data-lucide="check"></i></div><h2>你已完成第一次上屏</h2><p>生成画面 → 预览调整 → 上屏演示，完整流程已经走通，屏幕正在播放你的内容。</p><div class="ob-next"><small>接下来，你还可以</small><div><i data-lucide="clock"></i><span><strong>定时播放</strong><em>内容到点自动上屏，营业前就位</em></span><b>即将上线</b></div><div><i data-lucide="monitors"></i><span><strong>多屏投放</strong><em>一组屏幕同步播放同一套内容</em></span><b>即将上线</b></div><div><i data-lucide="trending-up"></i><span><strong>播放数据</strong><em>触达次数与停留时长回顾</em></span><b>即将上线</b></div></div><div class="button-row single"><button class="primary-button" type="button" data-action="ob-finish">查看屏幕</button></div>`);
        return true;
      }
    } catch (_) {}
    return false;
  },
  strip() {
    const d = this.data();
    if (d.done) return '';
    try { if (sessionStorage.getItem('ob-hide')) return ''; } catch (_) {}
    const steps = [['gen','生成画面'],['prev','预览效果'],['pub','上屏演示']];
    const n = steps.filter(([k]) => d[k]).length;
    return `<div class="ob-strip"><span class="ob-tag">新手引导 ${n}/3</span>${steps.map(([k, name]) => `<em class="${d[k] ? 'ok' : ''}"><i data-lucide="${d[k] ? 'check' : 'circle'}"></i>${name}</em>`).join('')}<button class="ob-hide" type="button" data-hub="ob-hide" aria-label="暂时隐藏引导"><i data-lucide="x"></i></button></div>`;
  }
};
window.Onboard = Onboard;
function rechargeSheet() {
  return `<div class="ch-sheet-head"><h2>积分充值</h2><button class="ch-icon" type="button" data-action="cancel-sheet" aria-label="关闭"><i data-lucide="x"></i></button></div><p class="cr-note">生成画面 2 积分/次 · 屏幕助手 1 积分/次</p><div class="cr-plans">${[[60, 6], [400, 30], [1000, 68]].map(([c, p]) => `<button class="cr-plan" type="button" data-action="recharge" data-amount="${c}"><span><strong>${c} 积分</strong><small>¥${p}</small></span><i data-lucide="chevron-right"></i></button>`).join('')}</div>`;
}
const statusCardHTML = (c) => `<div class="as-status-card"><div class="as-status-head"><i data-lucide="monitor"></i><strong>我的智显屏</strong><em>在线</em></div><div class="as-status-title">${escapeHTML(c.title)}</div><ul><li><i data-lucide="${c.playing ? 'play' : 'pause'}"></i>播放<cite>${c.playing ? '播放中' : '已暂停'}</cite></li><li><i data-lucide="bot"></i>讲解<cite>${c.narrating ? '进行中' : '未开启'}</cite></li><li><i data-lucide="list-ordered"></i>章节<cite>${c.chapter} / ${c.chapters}</cite></li><li><i data-lucide="volume-2"></i>音量<cite>${c.volume}%</cite></li></ul></div>`;
function screenStatus() {
  const pb = ContentHub.getPlayback();
  return { title: pb?.title || state.title, playing: state.playing, narrating: state.narrating, chapter: state.chapter, chapters: state.chapters, volume: state.volume };
}
const assistantChatBlock = () => `<div class="sc-chat"><div class="sc-chat-head"><i data-lucide="sparkles"></i><strong>屏幕智能助手</strong><span>${Credits.get()} 积分</span></div>${assistantMessages.length ? `<div class="as-feed" id="asFeed">${assistantMessages.map(m => m.card ? `<div class="as-msg ${m.role}">${statusCardHTML(m.card)}</div>` : `<div class="as-msg ${m.role}"><p>${escapeHTML(m.text)}</p></div>`).join('')}</div>` : ''}<div class="as-composer"><input id="asInput" placeholder="让屏幕做什么…" aria-label="让屏幕做什么"/><button class="as-mic" type="button" data-action="as-voice" aria-label="语音输入"><i data-lucide="mic"></i></button><button class="as-send" type="button" data-action="as-send" aria-label="发送"><i data-lucide="arrow-up"></i></button></div></div>`;

const preview = (compact = false) => ['home','terminal'].includes(state.route) && ContentHub.getPlayback()
  ? ContentHub.playbackMedia(state.playing)
  : ['home','terminal'].includes(state.route) && VisualStudio.getPublished()
  ? VisualStudio.artwork(VisualStudio.getPublished().data, state.playing)
  : `
  <div class="screen-preview${compact ? ' compact' : ''}">
    <div class="preview-brand"><img src="assets/zrobot-mark.png" alt="" />智显机器人</div>
    <div class="preview-orbit"></div>
    <div class="preview-copy"><strong>${escapeHTML(state.title)}</strong><span>${escapeHTML(state.subtitle)}</span></div>
  </div>`;

const backHeader = (title, desc, route = 'library') => `
  <div class="page-head">
    <button class="icon-button" type="button" data-route="${route}" aria-label="返回"><i data-lucide="chevron-left"></i></button>
    <div class="page-head-copy"><h2>${title}</h2><p>${desc}</p></div>
  </div>`;

const homeView = () => `<div class="home-wrap">
  <div class="screen-home-head">
    <div><h1 class="vs-sr-only">我的屏幕</h1><p class="screen-label">我的智显屏</p></div>
    <span class="status${state.terminalOnline ? '' : ' offline'}">演示 · ${state.terminalOnline ? '在线' : '离线'}</span>
  </div>

  <div class="screen-stage">
    ${preview()}
    <div class="screen-meta"><div><strong>${state.narrating ? '数字人正在讲解' : escapeHTML(ContentHub.getPlayback()?.title || VisualStudio.getPublished()?.data.title || '品牌产品介绍')}</strong><span>${ContentHub.getPlayback()||VisualStudio.getPublished() ? '上屏演示 · 未连接盒子' : state.narrating ? '内容与讲解同步播放' : '刚刚更新'}</span></div><span>16:9</span></div>
  </div>

  <button class="update-screen" type="button" data-route="library">
    <span><i data-lucide="image-plus"></i></span>
    <div><strong>更换内容</strong></div>
    <i data-lucide="arrow-right"></i>
  </button>

  <div class="screen-tools cols-3">
    <button type="button" data-route="terminal"><i data-lucide="sliders-horizontal"></i><span><strong>现场遥控</strong></span></button>
    <button type="button" data-route="quickstart"><i data-lucide="monitor-up"></i><span><strong>快速上屏</strong></span></button>
    <button type="button" data-action="start-narration"><i data-lucide="bot"></i><span><strong>${state.narrating ? '结束讲解' : '讲解'}</strong></span></button>
  </div>

  <div class="section-title"><h2>最近内容</h2><button type="button" data-route="library">查看全部</button></div>
  ${ContentHub.recent()}
  ${assistantChatBlock()}</div>`;

const quickstartProgress = () => `
  <div class="quickstart-progress" aria-label="快速上屏进度">
    ${[
      ['1','准备内容', state.quickstartStage === 'input'],
      ['2','确认画面', state.quickstartStage === 'result'],
      ['3','完成上屏', state.quickstartStage === 'success']
    ].map(([no,label,active]) => `<div class="quickstart-step${active ? ' active' : ''}"><span>${no}</span><small>${label}</small></div>`).join('')}
  </div>`;

const quickstartInput = () => `
  ${backHeader('更新我的屏幕', '一张图、一句话，快速完成第一条内容')}
  ${quickstartProgress()}
  <section class="quickstart-intro"><h1>先给我一张图片</h1><p>拍摄产品、空间或活动现场，我会自动整理成适合屏幕的画面。</p></section>
  <button class="quickstart-upload${state.quickstartUploaded ? ' uploaded' : ''}" type="button" data-action="quickstart-upload">
    ${state.quickstartUploaded ? `<span class="upload-preview"><i data-lucide="coffee"></i></span><div><strong>咖啡机产品图.jpg</strong><small>图片清晰，可以使用</small></div><i data-lucide="check"></i>` : `<span><i data-lucide="camera"></i></span><div><strong>拍照或选择图片</strong><small>支持JPG、PNG</small></div><i data-lucide="arrow-up-right"></i>`}
  </button>
  <label class="quickstart-prompt" for="quickstartPrompt"><span>想让屏幕怎么介绍它？</span><textarea id="quickstartPrompt" rows="3" placeholder="例如：咖啡机新品上市，突出智能研磨和静音">${escapeHTML(state.quickstartPrompt)}</textarea></label>
  <button class="primary-button quickstart-cta" type="button" data-action="quickstart-generate"><i data-lucide="sparkles"></i>生成第一条内容</button>
  <p class="privacy-note"><i data-lucide="lock-keyhole"></i>素材仅用于本次内容生成</p>`;

const quickstartResult = () => `
  ${backHeader('确认画面', '已经按16:9屏幕完成排版', 'quickstart')}
  ${quickstartProgress()}
  <section class="result-heading"><span class="result-check"><i data-lucide="check"></i></span><div><h1>第一条内容已准备好</h1><p>文字、清晰度与屏幕安全区检查通过</p></div></section>
  <div class="quickstart-result">${preview()}</div>
  <div class="quality-row"><span><i data-lucide="ratio"></i>16:9 · 1080P</span><span><i data-lucide="shield-check"></i>检查通过</span></div>
  <button class="primary-button quickstart-cta" type="button" data-action="quickstart-publish"><i data-lucide="monitor-up"></i>立即上屏</button>
  <button class="text-button" type="button" data-action="quickstart-edit">返回修改</button>`;

const quickstartSuccess = () => `
  <section class="success-screen">
    <span class="success-icon"><i data-lucide="check"></i></span>
    <p class="screen-label">交互流程演示</p>
    <h1>屏幕已经活起来了</h1>
    <p>快速上屏流程演示完成，真实用时与播放回执需接入设备后验证。</p>
  </section>
  <div class="quickstart-result success-preview">${preview()}</div>
  <div class="success-actions">
    <button class="primary-button" type="button" data-action="start-narration"><i data-lucide="bot"></i>让它讲起来</button>
    <button class="secondary-button" type="button" data-route="studio"><i data-lucide="pencil-line"></i>继续修改</button>
    <button class="secondary-button" type="button" data-route="terminal"><i data-lucide="sliders-horizontal"></i>控制屏幕</button>
  </div>`;

const quickstartView = () => state.quickstartStage === 'success'
  ? quickstartSuccess()
  : state.quickstartStage === 'result' ? quickstartResult() : quickstartInput();

const libraryView = () => ContentHub.library();
const galleryView = () => ContentHub.gallery();
const assetDetailView = () => ContentHub.detail();

const templatesView = () => `
  ${backHeader('创作新内容', '为唯一16:9终端选择一个起点')}
  <div class="template-grid">
    ${[
      ['product','产品介绍','AI生成图文与讲解',''],
      ['launch','新品发布','突出产品与品牌','purple'],
      ['welcome','欢迎画面','简洁的信息呈现','light'],
      ['avatar','数字人讲解','人物与内容联动','']
    ].map(([id,name,desc,tone]) => `<button class="template-card${state.selectedTemplate === id ? ' selected' : ''}" type="button" data-template="${id}"><span class="thumb ${tone}"></span><strong>${name}</strong><span>${desc}</span></button>`).join('')}
  </div>
  <div class="button-row single"><button class="primary-button purple" type="button" data-route="editor"><i data-lucide="arrow-right"></i>继续编辑</button></div>`;

const editorView = () => `
  ${backHeader('编辑内容', '所有内容固定生成16:9 · 1080P', 'templates')}
  <div class="edit-preview">${preview()}</div>
  <div class="form-stack">
    <div class="field"><label for="titleInput">主标题</label><input id="titleInput" value="${state.title}" /></div>
    <div class="field"><label for="subtitleInput">说明文字</label><input id="subtitleInput" value="${state.subtitle}" /></div>
    <div class="field"><label>内容风格</label><div class="segmented"><button class="active" type="button">简约</button><button type="button">科技</button><button type="button">活力</button></div></div>
    <div class="field"><label>品牌素材</label><div class="upload-row"><button class="upload-button" type="button" data-action="upload"><i data-lucide="image-plus"></i>上传图片</button><button class="upload-button" type="button" data-action="upload"><i data-lucide="video"></i>上传视频</button></div></div>
  </div>
  <div class="assistant-note"><img src="assets/zrobot-mark.png" alt="" /><div><strong>智显助手</strong><p>已按16:9整理画面结构，生成时会自动检查文字安全区。</p></div></div>
  <div class="toggle-row"><div><strong>添加数字人讲解</strong><span>云端预生成，发布后即可开始讲解</span></div><button class="switch${state.digitalHuman ? ' on' : ''}" type="button" data-action="toggle-avatar" aria-label="切换数字人"></button></div>
  <div class="button-row"><button class="secondary-button" type="button" data-route="home">保存草稿</button><button class="primary-button purple" type="button" data-action="generate"><i data-lucide="sparkles"></i>AI生成</button></div>`;

const previewView = () => state.previewSource === 'visual' ? VisualStudio.previewView() : `
  ${backHeader('预览与上屏', '播放前检查最终效果', state.previewSource)}
  <div class="edit-preview">${preview()}</div>
  <div class="assistant-note"><img src="assets/zrobot-mark.png" alt="" /><div><strong>画面检查通过</strong><p>16:9比例正确，文字未越界，数字人讲解已与当前版本绑定。</p></div></div>
  <div class="settings-list">
    <div class="setting-row"><div class="setting-copy"><i data-lucide="monitor-check"></i><div><strong>目标终端</strong><span>我的智显屏</span></div></div><span>在线</span></div>
    <div class="setting-row"><div class="setting-copy"><i data-lucide="ratio"></i><div><strong>输出规格</strong><span>1920 × 1080</span></div></div><span>16:9</span></div>
    <div class="setting-row"><div class="setting-copy"><i data-lucide="bot"></i><div><strong>数字人讲解</strong><span>智显助手 · 45秒</span></div></div><span>${state.digitalHuman ? '已准备' : '未添加'}</span></div>
  </div>
  <div class="button-row"><button class="secondary-button" type="button" data-route="${state.previewSource}">继续修改</button><button class="primary-button" type="button" data-action="publish"><i data-lucide="cast"></i>一键上屏</button></div>`;

const terminalView = () => `
  <div class="screen-home-head"><div><p class="screen-label">现场遥控</p><h1>控制屏幕</h1></div><span class="status">已连接</span></div>
  <div class="remote-now">${preview()}<div class="screen-meta"><div><strong>${state.narrating ? '数字人正在讲解' : state.playing ? escapeHTML(ContentHub.getPlayback()?.title||'品牌产品介绍') : '播放已暂停'}</strong><span>播放演示 · 未连接设备</span></div><span>16:9</span></div></div>
  <div class="remote-panel">
    <div class="remote-status"><span>播放控制</span><span>${state.playing ? '正在播放' : '已暂停'}</span></div>
    <div class="transport">
      <button type="button" data-action="previous" aria-label="上一项"><i data-lucide="skip-back"></i></button>
      <button class="main" type="button" data-action="toggle-play" aria-label="播放暂停"><i data-lucide="${state.playing ? 'pause' : 'play'}"></i></button>
      <button type="button" data-action="next" aria-label="下一项"><i data-lucide="skip-forward"></i></button>
    </div>
    <div class="volume"><i data-lucide="volume-1"></i><input type="range" min="0" max="100" value="${state.volume}" aria-label="音量" /><i data-lucide="volume-2"></i></div>
    <div class="remote-actions">
      <button type="button" data-action="start-narration"><i data-lucide="bot"></i>${state.narrating ? '结束讲解' : '开始讲解'}</button>
      <button type="button" data-action="previous"><i data-lucide="list-restart"></i>上一章节</button>
      <button type="button" data-action="next"><i data-lucide="list-end"></i>下一章节</button>
    </div>
  </div>
  ${state.narrating ? `<div class="robot-live"><img src="assets/zrobot-mark.png" alt="" /><div><strong>正在为现场讲解</strong><p>内容与字幕已同步播放</p></div><span class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>` : ''}`;

const profileView = () => `
  <section class="ch-page"><h1 class="vs-sr-only">我的</h1>
  <div class="ch-account"><span><i data-lucide="user-round"></i></span><div><strong>${escapeHTML((() => { try { return JSON.parse(localStorage.getItem('zrobot-user'))?.name || '本地体验用户'; } catch (_) { return '本地体验用户'; } })())}</strong><p>已保存 ${ContentHub.count()} 件内容</p></div></div>
  <div class="cr-card"><div class="cr-copy"><small>积分余额</small><strong>${Credits.get()}</strong><p>生成画面 2 积分/次 · 屏幕助手 1 积分/次</p></div><button class="cr-recharge" type="button" data-action="open-recharge">充值</button></div>
  <div class="ch-setting-list">
    <button type="button" data-route="home"><i data-lucide="monitor"></i>我的设备与屏幕<i data-lucide="chevron-right"></i></button>
    <button type="button" data-route="library"><i data-lucide="images"></i>我的作品<i data-lucide="chevron-right"></i></button>
    <button type="button" data-action="rebind"><i data-lucide="scan-line"></i>绑定设备<i data-lucide="chevron-right"></i></button>
    <button type="button" data-action="content-help"><i data-lucide="circle-help"></i>使用帮助<i data-lucide="chevron-right"></i></button>
  </div><p class="ch-local-note">当前为本地交互原型，真实账户、计费和设备服务待接入。</p></section>`;

const wechatLoginView = () => `
  <section class="wx-login">
    <div class="wx-top"><img src="assets/zrobot-mark.png" alt=""/><strong>智显机器人</strong><small>微信官方登录</small></div>
    <div class="wx-sheet">
      <p class="wx-apply">申请获取以下权限</p>
      <div class="wx-perm"><i data-lucide="smartphone"></i><div><strong>手机号</strong><small>用于登录与设备绑定</small></div><em>快速填充</em></div>
      <div class="wx-perm"><i data-lucide="circle-user-round"></i><div><strong>昵称、头像</strong><small>用于展示个人资料</small></div><em>公开信息</em></div>
      <p class="wx-agree">登录即代表同意 <u>用户协议</u> 与 <u>隐私政策</u></p>
      <div class="wx-btns"><button class="wx-deny" type="button" data-action="wx-deny">拒绝</button><button class="wx-allow" type="button" data-action="wx-allow">允许</button></div>
    </div>
    <p class="wx-note">交互流程演示 · 未接入真实微信授权</p>
  </section>`;
function wxAllowLogin(btn) {
  if (btn.disabled) return;
  btn.disabled = true; btn.textContent = '登录中…';
  setTimeout(() => {
    try { localStorage.setItem('zrobot-user', JSON.stringify({ name: '微信用户', via: 'wechat' })); } catch (_) {}
    showToast('登录成功');
    if (!Onboard.data().welcomed) { Onboard.mark('welcomed'); showIntroCarousel(); }
    else navigate('library');
  }, 900);
}
function showIntroCarousel() {
  navigate('gallery');
  setTimeout(() => openSheet(`<div class="ob-intro"><div class="ob-slide"><div class="ob-ico"><i data-lucide="wand-sparkles"></i></div><div><strong>① 一句话生成画面</strong><p>输入或说出想法，AI 立刻生成屏幕画面</p></div></div><div class="ob-slide"><div class="ob-ico"><i data-lucide="monitor-up"></i></div><div><strong>② 一键上屏</strong><p>预览满意后，内容立刻替换到你的智显屏</p></div></div><div class="ob-slide"><div class="ob-ico"><i data-lucide="bot"></i></div><div><strong>③ 说话即控制</strong><p>对助手说"开始讲解"，屏幕自动响应</p></div></div><div class="button-row single"><button class="primary-button" type="button" data-action="ob-start">开始体验</button></div></div>`), 350);
}

const views = { home: homeView, quickstart: quickstartView, gallery: galleryView, content: libraryView, library: libraryView, 'asset-detail':assetDetailView, 'project-history': () => ContentHub.history(), studio: () => VisualStudio.view(), templates: templatesView, editor: editorView, preview: previewView, terminal: terminalView, profile: profileView, 'wechat-login': wechatLoginView, create: () => ContentHub.createView() };

function render() {
  document.querySelector('.phone').classList.toggle('visual-creation', state.route === 'studio');
  const view = views[state.route] || homeView;
  appContent.innerHTML = view();
  const navRoute = ['content','asset-detail'].includes(state.route) ? 'library' : ['studio','project-history','templates','editor','preview','create'].includes(state.route) ? 'gallery' : ['terminal','quickstart'].includes(state.route) ? 'home' : state.route;
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.route === navRoute));
  const focusedRoute = ['studio','project-history','templates','editor','preview','asset-detail','wechat-login','create'].includes(state.route) || (state.route === 'quickstart' && state.quickstartStage !== 'success');
  document.querySelector('.tab-bar').style.display = focusedRoute ? 'none' : 'grid';
  appContent.style.paddingBottom = focusedRoute ? '28px' : '112px';
  lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
  renderOrb();
}

let wechatLoginStarted = false;

function navigate(route) {
  const leavingStudio = state.route === 'studio' && route !== 'studio';
  if (leavingStudio) VisualStudio.leave();
  state.route = route;
  if (leavingStudio) ContentHub.flushSave?.();
  appContent.scrollTop = 0;
  render();
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 1800);
}

function openSheet(content) {
  modalLayer.innerHTML = `<div class="sheet"><div class="sheet-grabber"></div>${content}</div>`;
  modalLayer.hidden = false;
  modalLayer.classList.add('open');
  lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
}

function closeSheet() {
  modalLayer.classList.remove('open');
  modalLayer.hidden = true;
  modalLayer.innerHTML = '';
}

function runQuickstartGeneration() {
  const input = document.getElementById('quickstartPrompt');
  const prompt = input?.value.trim();
  if (!state.quickstartUploaded) { showToast('先拍照或选择一张图片'); return; }
  if (!prompt) { showToast('用一句话告诉我想展示什么'); return; }
  state.quickstartPrompt = prompt;
  openSheet(`<h2>正在准备第一条内容</h2><p>我们会优先完成一个可以立即上屏的版本。</p><div class="quickstart-loading"><span class="active">理解图片</span><span>整理文案</span><span>适配屏幕</span><span>完成检查</span></div><div class="progress-track"><span id="quickstartProgress"></span></div><div class="progress-label"><span id="quickstartLabel">理解图片</span><span id="quickstartPercent">0%</span></div>`);
  const labels = ['理解图片','整理产品卖点','适配16:9屏幕','完成上屏检查'];
  let value = 0;
  const timer = window.setInterval(() => {
    value += 25;
    const bar = document.getElementById('quickstartProgress');
    if (!bar) { window.clearInterval(timer); return; }
    bar.style.width = `${value}%`;
    document.getElementById('quickstartPercent').textContent = `${value}%`;
    document.getElementById('quickstartLabel').textContent = labels[Math.min(labels.length - 1, value / 25 - 1)];
    if (value >= 100) {
      window.clearInterval(timer);
      window.setTimeout(() => {
        closeSheet();
        state.title = '静享每一刻';
        state.subtitle = '智能研磨 · 精准萃取';
        state.quickstartStage = 'result';
        render();
      }, 260);
    }
  }, 310);
}

function runQuickstartPublish() {
  openSheet(`<h2>正在更新屏幕</h2><p>当前内容会继续播放，新版本检查完成后再切换。</p><div class="publish-steps"><span class="done"><i data-lucide="check"></i>内容已生成</span><span id="publishStep2"><i data-lucide="loader-circle"></i>发送到盒子</span><span id="publishStep3"><i data-lucide="circle"></i>校验并播放</span></div><div class="progress-track"><span id="quickPublishProgress"></span></div>`);
  let value = 0;
  const timer = window.setInterval(() => {
    value += 25;
    const bar = document.getElementById('quickPublishProgress');
    if (!bar) { window.clearInterval(timer); return; }
    bar.style.width = `${value}%`;
    if (value >= 50) document.getElementById('publishStep2').classList.add('done');
    if (value >= 75) document.getElementById('publishStep3').classList.add('done');
    if (value >= 100) {
      window.clearInterval(timer);
      window.setTimeout(() => { closeSheet(); VisualStudio.clearPublished(); state.quickstartStage = 'success'; render(); }, 300);
    }
  }, 330);
}

function runGeneration() {
  const titleInput = document.getElementById('titleInput');
  const subtitleInput = document.getElementById('subtitleInput');
  if (titleInput) state.title = titleInput.value.trim() || state.title;
  if (subtitleInput) state.subtitle = subtitleInput.value.trim() || state.subtitle;
  openSheet(`<h2>正在生成内容</h2><p>智显助手正在整理文字、画面和数字人讲解。</p><div class="progress-track"><span id="generationProgress"></span></div><div class="progress-label"><span id="generationLabel">分析内容</span><span id="generationPercent">0%</span></div>`);
  let value = 0;
  const labels = ['分析内容','生成画面','适配16:9','准备数字人','完成检查'];
  const timer = window.setInterval(() => {
    value += 20;
    document.getElementById('generationProgress').style.width = `${value}%`;
    document.getElementById('generationPercent').textContent = `${value}%`;
    document.getElementById('generationLabel').textContent = labels[Math.min(labels.length - 1, value / 20 - 1)];
    if (value >= 100) {
      window.clearInterval(timer);
      window.setTimeout(() => { closeSheet(); state.previewSource = 'editor'; navigate('preview'); }, 450);
    }
  }, 420);
}

function runPublish() {
  openSheet(`<h2>正在发布到屏幕</h2><p>盒子将完整下载并校验后切换，当前内容会继续正常播放。</p><div class="progress-track"><span id="publishProgress"></span></div><div class="progress-label"><span id="publishLabel">生成播放包</span><span id="publishPercent">0%</span></div>`);
  let value = 0;
  const labels = ['生成播放包','发送到盒子','校验完整性','切换内容'];
  const timer = window.setInterval(() => {
    value += 25;
    document.getElementById('publishProgress').style.width = `${value}%`;
    document.getElementById('publishPercent').textContent = `${value}%`;
    document.getElementById('publishLabel').textContent = labels[Math.min(labels.length - 1, value / 25 - 1)];
    if (value >= 100) {
      window.clearInterval(timer);
      window.setTimeout(() => {
        openSheet(`<div class="success-mark"><i data-lucide="check"></i></div><h2>内容已经上屏</h2><p>我的智显屏正在播放最新版本，数字人讲解已经准备完成。</p><div class="button-row single"><button class="primary-button purple" type="button" data-action="publish-done">开始讲解</button></div>`);
      }, 450);
    }
  }, 430);
}

document.addEventListener('click', (event) => {
  const routeTarget = event.target.closest('[data-route]');
  if (routeTarget) { navigate(routeTarget.dataset.route); return; }

  const template = event.target.closest('[data-template]');
  if (template) { state.selectedTemplate = template.dataset.template; render(); return; }

  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;

  if(action === 'content-help')openSheet('<h2>从内容到屏幕</h2><p>创作用于制作与修改。内容库统一保存生成作品和上传文件，选择后预览上屏；文档须先转换。</p><p>编辑不会改变当前播放，确认发布后才切换。当前为本地演示，未连接真实盒子。</p><button type="button" class="ch-primary" data-action="cancel-sheet">知道了</button>');

  if (action === 'toggle-avatar') { state.digitalHuman = !state.digitalHuman; render(); }
  if (action === 'quickstart-upload') { state.quickstartUploaded = true; render(); document.getElementById('quickstartPrompt')?.focus(); }
  if (action === 'quickstart-generate') runQuickstartGeneration();
  if (action === 'quickstart-edit') { state.quickstartStage = 'input'; render(); document.getElementById('quickstartPrompt')?.focus(); }
  if (action === 'quickstart-publish') runQuickstartPublish();
  if (action === 'generate') runGeneration();
  if (action === 'publish') runPublish();
  if (action === 'publish-done') { closeSheet(); VisualStudio.clearPublished(); state.narrating = true; state.playing = true; navigate('terminal'); }
  if (action === 'toggle-play') { state.playing = !state.playing; render(); showToast(state.playing ? '继续播放' : '已暂停'); }
  if (action === 'start-narration') { state.narrating = !state.narrating; state.playing = true; render(); showToast(state.narrating ? '数字人开始讲解' : '已结束讲解'); }
  if (action === 'previous') { state.chapter = Math.max(1, state.chapter - 1); showToast(`已切换到上一章节 · ${state.chapter}/${state.chapters}`); }
  if (action === 'next') { state.chapter = Math.min(state.chapters, state.chapter + 1); showToast(`已切换到下一章节 · ${state.chapter}/${state.chapters}`); }
  if (action === 'upload') showToast('原型中已模拟素材上传');
  if (action === 'rebind') openSheet(`<h2>扫描盒子小程序码</h2><p>重新绑定将替换当前唯一终端。正式版本会调用微信扫码能力。</p><div class="button-row"><button class="secondary-button" type="button" data-action="cancel-sheet">取消</button><button class="primary-button purple" type="button" data-action="simulate-bind">模拟绑定</button></div>`);
  if (action === 'cancel-sheet') closeSheet();
  if (action === 'simulate-bind') { closeSheet(); showToast('盒子绑定成功'); navigate('home'); }
  if (action === 'open-recharge') openSheet(rechargeSheet());
  if (action === 'go-recharge') { closeSheet(); navigate('profile'); setTimeout(() => openSheet(rechargeSheet()), 380); }
  if (action === 'recharge') { Credits.set(Credits.get() + (Number(actionTarget.dataset.amount) || 0)); closeSheet(); showToast(`充值成功 · 余额 ${Credits.get()} 积分`); }
  if (action === 'as-send') { const i = document.getElementById('asInput'); const v = i?.value; if (i) i.value = ''; handleAssistant(v); }
  if (action === 'as-chip') handleAssistant(actionTarget.dataset.value);
  if (action === 'as-voice') window.ZVoice?.toggle(actionTarget, document.getElementById('asInput'));
  if (action === 'orb-close') { closeOrb(); render(); }
  if (action === 'chat-go') { ContentHub.setTab?.(actionTarget.dataset.tab === 'templates' ? 'templates' : 'free'); navigate('create'); }
  if (action === 'wx-allow') wxAllowLogin(actionTarget);
  if (action === 'wx-deny') { showToast('已取消登录'); navigate('home'); }
  if (action === 'ob-start') { closeSheet(); navigate('create'); }
  if (action === 'ob-finish') { closeSheet(); navigate('home'); }
  if (action === 'orb-voice') window.ZVoice?.toggle(actionTarget, document.getElementById('orbInput'));
});

document.addEventListener('input', (e) => { if (e.target.matches?.('.volume input')) state.volume = Number(e.target.value); });
document.addEventListener('keydown', (e) => {
  if (['asInput', 'orbInput'].includes(e.target.id) && e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    const v = e.target.value;
    e.target.value = '';
    handleAssistant(v);
  }
});

modalLayer.addEventListener('click', (event) => { if (event.target === modalLayer) closeSheet(); });
document.getElementById('profileButton').addEventListener('click', () => navigate('profile'));
function applyTheme() {
  let t = null;
  try { t = localStorage.getItem('zrobot-theme'); } catch (_) {}
  if (t !== 'dark' && t !== 'light') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.querySelector('.phone').setAttribute('data-theme', t);
}
function toggleTheme() {
  const next = document.querySelector('.phone').getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('zrobot-theme', next); } catch (_) {}
  document.querySelector('.phone').setAttribute('data-theme', next);
  const i = document.querySelector('#themeButton i');
  if (i) i.setAttribute('data-lucide', next === 'dark' ? 'sun' : 'moon');
  lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
  showToast(next === 'dark' ? '已切换深色模式' : '已切换浅色模式');
}
document.getElementById('themeButton').addEventListener('click', toggleTheme);
applyTheme();

VisualStudio.init({render,navigate,toast:showToast,openSheet,closeSheet,changed:()=>ContentHub.queueSave(),
  spend:(n,reason)=>Credits.spend(n,reason),
  onboard:(step)=>Onboard.mark(step),
  preview(){state.previewSource='visual';navigate('preview');},
  async published(version){await ContentHub.setStudioPlayback(version);state.title=version.data.title;state.subtitle=version.data.subtitle;state.digitalHuman=false;state.narrating=false;state.playing=true;render();},
  cleared(){ContentHub.clearPlayback().catch(()=>showToast('播放状态未保存，请刷新重试'));}
});
ContentHub.init({render,navigate,toast:showToast,openSheet,closeSheet,route:()=>state.route,isOnline:()=>state.terminalOnline,isPlaying:()=>state.playing,
  onPlayback(){state.playing=true;state.narrating=false;state.digitalHuman=false;render();},
  onboard:(step)=>Onboard.mark(step)
});
render();
