/* Business tasks are independent from output file formats. */
window.CreationScenarios=(()=>{
  const scenes=[
    {id:'product',name:'产品介绍',icon:'package',title:'产品或服务名称',subtitle:'想介绍的重点',purpose:'product',scene:'gallery',style:'quiet'},
    {id:'event',name:'活动通知',icon:'megaphone',title:'活动或通知主题',subtitle:'规则与说明',purpose:'event',scene:'studio',style:'bold'},
    {id:'welcome',name:'欢迎接待',icon:'handshake',title:'来访对象或活动名称',subtitle:'欢迎语',purpose:'welcome',scene:'gallery',style:'quiet'},
    {id:'art',name:'艺术氛围',icon:'flower-2',title:'作品名称',subtitle:'',purpose:'product',scene:'nature',style:'quiet'}
  ];
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const close='<button class="ch-icon" data-hub="close" type="button" aria-label="关闭"><i data-lucide="x"></i></button>';
  function sheet(){return `<div class="ch-sheet-head"><h2>这次想做什么？</h2>${close}</div><div class="cs-grid">${scenes.map(s=>`<button type="button" data-hub="scenario" data-value="${s.id}" aria-label="${s.name}"><i data-lucide="${s.icon}"></i><span>${s.name}</span><i data-lucide="arrow-up-right"></i></button>`).join('')}</div><div class="cs-secondary"><button data-hub="free-create" type="button">自由创作<i data-lucide="sparkles"></i></button><button data-hub="import" type="button">上传资料<i data-lucide="upload"></i></button></div>`;}
  function form(id){const s=scenes.find(s=>s.id===id);if(!s)return '';return `<div class="ch-sheet-head"><h2>${s.name}</h2>${close}</div><form id="scenarioForm" data-scenario="${s.id}" class="vs-text-form cs-form"><label>${s.title}<input name="title" maxlength="36" ${s.id==='art'?'placeholder="可选"':'required'} /></label>${s.subtitle?`<label>${s.subtitle}<input name="subtitle" maxlength="80" ${s.id==='welcome'?'':'required'}/></label>`:''}${['product','event'].includes(id)?'<label>价格<input name="price" maxlength="20" placeholder="选填"/></label>':''}${['event','welcome'].includes(id)?'<label>展示时间<input name="dateText" maxlength="40" placeholder="选填，如 9月26日 14:00"/></label>':''}${id==='art'?'<label>氛围<select name="style"><option value="quiet">自然</option><option value="warm">温暖</option><option value="tech">深邃</option><option value="bold">鲜明</option></select></label><p class="ch-subtle">无文字 · 使用艺术示例，可换成自己的图片</p>':''}<button class="ch-primary" type="submit">开始创作</button></form>`;}
  function seed(data,id){const s=scenes.find(s=>s.id===id);if(!s)return null;const value=n=>String(data.get(n)||'').trim();if(id!=='art'&&(!value('title')||id!=='welcome'&&!value('subtitle')))return null;return {scenario:id,title:value('title')||(id==='art'?'自然光影':''),subtitle:value('subtitle'),price:value('price'),dateText:value('dateText'),purpose:s.purpose,scene:s.scene,style:id==='art'?value('style'):s.style,showText:id!=='art',...(id==='art'?{asset:'assets/scene-nature.jpg',assetName:'自然实拍'}:{})};}
  return {sheet,form,seed,name:id=>scenes.find(s=>s.id===id)?.name||'自由创作'};
})();
