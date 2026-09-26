/* Browser prototype: local compositing, persistence and animation; no AI or device API. */
window.VisualStudio = (() => {
  const key = 'zrobot.visual-studio.v1';
  const sample = 'assets/scene-gallery.jpg';
  const choices = {
    purpose: [['product','产品介绍','产品与卖点'],['launch','新品发布','突出主视觉'],['welcome','欢迎画面','清晰的来访信息'],['event','活动宣传','主题与时间']],
    scene: [['gallery','产品展台','干净的陈列空间'],['kitchen','明亮厨房','柔光与空间感'],['nature','自然光影','清新的绿色背景'],['studio','纯色空间','聚焦产品本身']],
    style: [['quiet','简约','克制的配色'],['tech','科技','深色与光感'],['warm','温暖','柔和的暖白'],['bold','鲜明','醒目的品牌色']],
    motion: [['none','静态画面','保持当前画面'],['push','缓慢推进','轻缓的整体运镜'],['focus','产品聚焦','产品轻微靠近'],['reveal','文字浮现','标题与卖点依次呈现']]
  };
  const base = { asset: sample, assetName: '咖啡机示例', scenario:'free', showText:true, dateText:'', purpose:'product', scene:'gallery', style:'quiet', title:'每一杯，都刚刚好', subtitle:'智能研磨 · 静享醇香', price:'', prompt:'', motion:'none' };
  let draft = {...base}, versions = [], selected = null, pending = null, published = null;
  let projectId = `project-${Date.now()}`;
  let panel = null, busy = false, issue = '', playing = false, job = 0, dirty = false, saved = true, pendingChanges=[];
  let hooks = {}, returnFocus = null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy = value => JSON.parse(JSON.stringify(value));
  const label = (type, id) => choices[type].find(x => x[0] === id)?.[1] || '';
  const safeAsset = value => typeof value === 'string' && (value === sample || /^assets\/(scene|sample|art)-/.test(value) || /^data:image\/(png|jpeg|webp);base64,/.test(value));
  function sanitize(value) {
    const d={...base};
    if (!value || typeof value !== 'object') return d;
    for (const type of Object.keys(choices)) if(choices[type].some(c => c[0] === value[type])) d[type]=value[type];
    for (const [field,max] of [['title',36],['subtitle',80],['price',20],['prompt',300],['assetName',80]]) if(typeof value[field]==='string') d[field]=value[field].slice(0,max);
    d.dateText=typeof value.dateText==='string'?value.dateText.slice(0,40):'';
    if(['product','event','welcome','art','free'].includes(value.scenario))d.scenario=value.scenario;
    d.showText=value.showText!==false;
    if(safeAsset(value.asset))d.asset=value.asset;
    return d;
  }
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    if(data){
      if(typeof data.projectId==='string')projectId=data.projectId;
      draft=sanitize(data.draft);versions=(Array.isArray(data.versions)?data.versions:[]).filter(v=>typeof v.id==='string').map(v=>({...v,data:sanitize(v.data)}));
      selected=versions.some(v=>v.id===data.selected)?data.selected:null;
      if(data.published)published={...data.published,data:sanitize(data.published.data)};
      dirty=!!data.dirty;
      pendingChanges=Array.isArray(data.pendingChanges)?data.pendingChanges.filter(x=>typeof x==='string'):[];
    }
  } catch (_) { /* Invalid or unavailable storage starts a fresh draft. */ }
  function persist(notify=true) {
    try {localStorage.setItem(key,JSON.stringify({projectId,draft,versions,selected,published,dirty,pendingChanges}));saved=true;}
    catch (_) {saved=false;}
    if(notify)hooks.changed?.();
  }
  function repaint() {
    const scrollTop=document.querySelector('.vs-scroll')?.scrollTop||0;
    hooks.render?.();
    const scroll=document.querySelector('.vs-scroll');if(scroll)scroll.scrollTop=scrollTop;
    if(panel)document.querySelector('.vs-tray button, .vs-tray input')?.focus({preventScroll:true});
  }
  function markChange(message){pendingChanges.push(message);dirty=true;}
  function change(field,value) {if(draft[field]===value)return;draft[field]=value;markChange(`${({style:'风格',scene:'场景',purpose:'布局',motion:'动效'})[field]||field}：${label(field,value)}`);playing=false;persist();repaint();}
  const current = () => versions.find(v=>v.id===selected);
  function artwork(data=draft, animate=false, mini=false) {
    if(data.showText===false)return `<div class="vs-art vs-art-pure style-${data.style}" role="img" aria-label="${esc(data.title)}"><img src="${esc(data.asset)}" alt="${esc(data.assetName)}"/></div>`;
    return `<div class="vs-art purpose-${data.purpose} scene-${data.scene} style-${data.style} motion-${animate?data.motion:'none'} ${mini?'vs-mini':''}" role="img" aria-label="${esc(data.title)}，${esc(label('scene',data.scene))}，${esc(label('style',data.style))}">
      <div class="vs-art-world"><div class="vs-room"></div><div class="vs-plinth"></div><img class="vs-product" src="${esc(data.asset)}" alt="${esc(data.assetName)}"/><div class="vs-art-brand"><img src="assets/zrobot-mark.png" alt=""/> ZROBOT</div><div class="vs-art-copy"><strong>${esc(data.title)}</strong><span>${esc(data.subtitle)}</span>${data.price?`<b>${esc(data.price)}</b>`:''}${data.dateText?`<span>${esc(data.dateText)}</span>`:''}</div></div></div>`;
  }
  function optionCards(type) {
    return choices[type].map(([id,name])=>`<button class="vs-choice ${draft[type]===id?'selected':''}" type="button" data-vs="choose" data-field="${type}" data-value="${id}" aria-pressed="${draft[type]===id}">${artwork({...draft,[type]:id},false,true)}<span><strong>${name}</strong></span>${draft[type]===id?'<i data-lucide="check"></i>':''}</button>`).join('');
  }
  function tray() {
    if(!panel)return '';
    const titles={asset:'图片',purpose:'布局',scene:'场景',style:'风格',text:'文字',motion:'动效',history:'版本',more:'更多',about:'演示说明'};
    let body='';
    if(panel==='about')body='<p class="vs-tray-note">本地交互原型。描述仅保存，画面由示例布局组合；未接入AI生成、视频导出和真实上屏。素材保存在当前浏览器。</p>';
    else if(panel==='more')body=`<div class="vs-menu">${[['text','type','文字'],['asset','image','图片'],['scene','mountain','场景'],['purpose','panels-top-left','布局'],['style','palette','风格'],['motion','clapperboard','动效'],['history','history','版本']].filter(([p])=>draft.showText!==false||!['scene','purpose','motion'].includes(p)).map(([p,icon,name])=>`<button type="button" data-vs="panel" data-panel="${p}"><i data-lucide="${icon}"></i>${name}<i data-lucide="chevron-right"></i></button>`).join('')}<button type="button" data-vs="toggle-text"><i data-lucide="type"></i>${draft.showText?'隐藏画面文字':'显示画面文字'}</button></div>`;
    else if(panel==='asset')body=`<div class="vs-source-actions"><button data-vs="upload" type="button"><i data-lucide="image-plus"></i>上传图片</button><button data-vs="sample" type="button"><i data-lucide="coffee"></i>使用示例</button></div><p class="vs-tray-note">JPG / PNG / WebP · ≤5MB</p>`;
    else if(panel==='text')body=`<form id="vsTextForm" class="vs-text-form"><label>${draft.showText?'标题':'作品名称'}<input name="title" required maxlength="36" value="${esc(draft.title)}"/></label>${draft.showText?`<label>卖点或说明<input name="subtitle" maxlength="80" value="${esc(draft.subtitle)}"/></label><label>价格<input name="price" maxlength="20" placeholder="选填" value="${esc(draft.price)}"/></label><label>展示时间<input name="dateText" maxlength="40" placeholder="仅修改展示文字，不自动排期" value="${esc(draft.dateText)}"/></label>`:''}<button class="vs-primary" type="submit">完成</button></form>`;
    else if(panel==='history')body=versions.length?`<div class="vs-history">${[...versions].reverse().map((v)=>`<button type="button" data-vs="restore" data-id="${v.id}" aria-pressed="${selected===v.id}">${artwork(v.data,false)}<span><strong>版本 ${v.number}${selected===v.id?' · 当前':''}</strong><small>${esc(v.request||v.note)}</small></span></button>`).join('')}</div>`:'<p class="vs-tray-note">生成后保留版本记录。</p>';
    else body=`<div class="vs-options">${optionCards(panel)}</div>${panel==='motion'?`<p class="vs-tray-note">仅预览，暂不支持导出视频。</p><button type="button" class="vs-secondary" data-vs="play">${playing?'暂停':'播放'}</button>`:''}`;
    return `<div class="vs-drawer-layer"><button class="vs-scrim" type="button" data-vs="close" aria-label="关闭面板"></button><section class="vs-tray" role="dialog" aria-modal="true" aria-label="${titles[panel]}"><header><h2>${titles[panel]}</h2><button type="button" data-vs="close" class="vs-icon" aria-label="收起选项"><i data-lucide="x"></i></button></header>${body}</section></div>`;
  }
  function view() {
    const version=current();
    const hasResult=versions.length>0;
    const send=`<button class="vs-send" type="button" data-vs="generate" aria-label="${hasResult?'生成新版本':'生成画面'}" ${busy?'disabled':''}><i data-lucide="${busy?'loader-circle':'arrow-up'}"></i></button>`;
    const mic=`<button class="vs-send vs-mic" type="button" data-vs="voice" aria-label="语音输入"><i data-lucide="mic"></i></button>`;
    const prompt=`<textarea id="vsPrompt" maxlength="300" aria-label="${hasResult?'描述一个变化':'描述想要的画面'}" placeholder="${hasResult?'想改哪里？':'描述你想要的画面…'}" ${busy?'disabled':''}>${esc(draft.prompt)}</textarea>`;
    return `<section class="vs-studio ${hasResult?'is-result':'is-new'} ${panel?'has-panel':''}" aria-label="图片创作">
      <header class="vs-topbar"><button class="vs-icon vs-round" type="button" data-route="gallery" aria-label="返回创作中心"><i data-lucide="${hasResult?'chevron-left':'x'}"></i></button><h1 class="vs-sr-only">${hasResult?'编辑作品':'新建图片'}</h1><button class="vs-demo-badge" type="button" data-vs="panel" data-panel="about" aria-label="演示模式，查看说明">演示</button>${hasResult?`<div class="vs-top-actions"><button class="vs-done" data-vs="preview" type="button" ${busy?'disabled':''}>上屏<i data-lucide="arrow-up-right"></i></button><button class="vs-icon vs-round" type="button" data-vs="panel" data-panel="more" aria-label="更多作品选项"><i data-lucide="ellipsis"></i></button></div>`:''}</header>
      ${hasResult?`<div class="vs-scroll">
        <div class="vs-result-meta"><button type="button" data-vs="panel" data-panel="style"><span class="vs-style-dot style-${draft.style}"></span>${CreationScenarios.name(draft.scenario)}</button><span>16:9</span></div>
        <div class="vs-canvas">${artwork(draft,playing)}<span class="vs-version-badge">v${version?.number||1} / ${versions.length}${dirty?' · 已调整':''}</span>${versions.length>1?`<button class="vs-canvas-arrow prev" type="button" data-vs="previous" aria-label="上一个版本"><i data-lucide="chevron-left"></i></button><button class="vs-canvas-arrow next" type="button" data-vs="next" aria-label="下一个版本"><i data-lucide="chevron-right"></i></button>`:''}${busy?'<div class="vs-working" role="status"><span></span>正在组合演示画面…</div>':''}</div>
        <div class="vs-quick-actions"><button type="button" data-vs="panel" data-panel="text"><i data-lucide="square-pen"></i>${draft.showText?'改信息':'改名称'}</button><button type="button" data-vs="panel" data-panel="asset"><i data-lucide="image"></i>换图片</button>${dirty?'<button type="button" data-vs="save-version">保存版本</button>':''}</div>
        <div class="vs-filmstrip" aria-label="版本历史">${versions.length>1?versions.map(v=>`<button type="button" data-vs="restore" data-id="${v.id}" aria-label="查看版本 ${v.number}" aria-pressed="${selected===v.id}">${artwork(v.data,false)}<span>v${v.number}</span></button>`).join(''):''}</div>
        <details class="vs-records"><summary>创作记录<span>${versions.length}</span></summary>${[...versions].reverse().map(v=>`<article><header><strong>版本 ${v.number}</strong>${v.createdAt?`<time>${new Date(v.createdAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time>`:''}</header>${v.request?`<small>你</small><p class="vs-user-request">${esc(v.request)}</p>`:''}${v.changes?.length?`<small>修改记录</small><p>${v.changes.map(esc).join('；')}</p>`:''}<p class="vs-record-result">${v.request?'要求已记录 · AI处理为演示':v.changes?.length?'已保存画面调整':`系统记录 · ${esc(v.note||'已生成版本')}`}</p></article>`).join('')}</details>
        ${!saved?'<p class="vs-error" role="alert">浏览器存储空间不足，当前调整未保存。</p>':''}
      </div><div class="vs-result-bottom"><div class="vs-followup">${prompt}${mic}${send}</div></div>`:`<div class="vs-new-body">${draft.scenario!=='free'?`<div class="vs-brief"><span>${CreationScenarios.name(draft.scenario)}</span><button type="button" data-vs="panel" data-panel="text">${esc(draft.title)}<i data-lucide="square-pen"></i></button></div>`:''}<div class="vs-prompt-card">${prompt}<div class="vs-ingredients"><button type="button" data-vs="panel" data-panel="asset" aria-label="更换主体图片：${esc(draft.assetName)}"><img src="${esc(draft.asset)}" alt=""/><span>${draft.asset.startsWith('assets/')?'示例':'已添加'}</span></button></div><div class="vs-input-tools"><div>${[['asset','image','图片'],...(draft.showText?[['scene','sparkles','场景'],['purpose','layout-grid','布局']]:[])].map(([p,icon,name])=>`<button type="button" data-vs="panel" data-panel="${p}"><i data-lucide="${icon}"></i>${name}</button>`).join('')}</div>${mic}${send}</div>${busy?'<div class="vs-creating" role="status">生成中…</div>':''}</div><div class="vs-style-picker" role="group" aria-label="风格"><div>${choices.style.map(([id,name])=>`<button type="button" data-vs="choose" data-field="style" data-value="${id}" aria-pressed="${draft.style===id}">${name}</button>`).join('')}</div></div></div>`}
      ${issue?`<div class="vs-inline-error" role="alert">${esc(issue)}<button type="button" data-vs="retry">重试</button></div>`:''}${tray()}
    </section>`;
  }
  function addVersion(data,note) {
    const number=(versions.at(-1)?.number||0)+1;
    const v={id:`v-${Date.now()}-${number}`,projectId,number,data:copy(data),note,parentId:selected,request:data.prompt?.trim()||'',changes:[...pendingChanges],createdAt:Date.now()};
    versions.push(v);selected=v.id;dirty=false;pendingChanges=[];persist();return v;
  }
  function generate() {
    if(busy)return;
    if(hooks.spend&&!hooks.spend(2,'生成画面'))return;
    if(!draft.title.trim()){issue='请先填写主标题。';panel='text';repaint();return;}
    busy=true;issue='';playing=false;panel=null;
    const snapshot=copy(draft), token=++job;
    repaint();
    setTimeout(()=>{
      if(token!==job)return;
      addVersion(snapshot,snapshot.prompt||`${label('scene',snapshot.scene)} · ${label('style',snapshot.style)}`);
      busy=false;dirty=JSON.stringify(snapshot)!==JSON.stringify(draft);draft.prompt='';persist();repaint();
      hooks.onboard?.('gen');
      hooks.toast?.('已生成演示版本');
    },900);
  }
  function restore(id) {
    const v=versions.find(x=>x.id===id);if(!v)return;
    if(dirty && selected!==id)addVersion(draft,'自动保存的调整');
    selected=id;draft=copy(v.data);draft.prompt='';dirty=false;playing=false;panel=null;persist();repaint();
  }
  function saveVersion(){if(!dirty||busy)return;addVersion(draft,'保存修改');draft.prompt='';persist();repaint();hooks.toast?.('版本已保存');}
  function openPreview() {
    hooks.onboard?.('prev');
    if(busy)return;
    const v=dirty||!current()?addVersion(draft,'文字或布局调整'):current();
    pending=copy(v);playing=false;persist();hooks.preview?.();
  }
  function previewView() {
    if(!pending){hooks.navigate?.('studio');return '';}
    return `<div class="vs-preview"><div class="page-head"><button class="vs-icon" type="button" data-route="studio" aria-label="返回创作"><i data-lucide="chevron-left"></i></button><div><h1>预览上屏</h1></div></div>${artwork(pending.data,playing)}<div class="vs-preview-lines"><p><span>版本 ${pending.number}</span><strong>16:9 · 1080P</strong></p><p><span>屏幕</span><strong>我的智显屏</strong></p></div>${pending.data.motion!=='none'?`<button class="vs-secondary" data-vs="play" type="button">${playing?'暂停':'预览动效'}</button>`:''}<p class="vs-demo-note">演示模式 · 未连接设备</p><button class="vs-primary" type="button" data-vs="publish">演示上屏</button><button class="text-button" type="button" data-route="studio">返回编辑</button></div>`;
  }
  function publish() {
    if(busy||!pending)return;
    busy=true;const snapshot=copy(pending);
    hooks.openSheet?.('<h2>上屏演示中…</h2>');
    setTimeout(async()=>{
      try{
        await hooks.published?.(copy(snapshot));
        published=snapshot;persist();hooks.closeSheet?.();
        hooks.openSheet?.('<div class="success-mark"><i data-lucide="check"></i></div><h2>上屏演示完成</h2><button class="vs-primary" type="button" data-vs="finish">查看屏幕</button>');
      }catch(_){hooks.closeSheet?.();hooks.toast?.('上屏未完成，当前播放未改变');}
      finally{busy=false;}
    },950);
  }
  const picker = document.createElement('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp';picker.hidden=true;document.body.append(picker);
  picker.addEventListener('change',async()=>{
    const file=picker.files?.[0];picker.value='';if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){issue='请选择5MB以内的JPG、PNG或WebP图片。';repaint();return;}
    try {
      const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
      const img=new Image();img.src=url;await img.decode();
      const scale=Math.min(1,900/Math.max(img.width,img.height));
      const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      draft.asset=canvas.toDataURL(file.type==='image/png'?'image/png':'image/jpeg',.82);draft.assetName=file.name;issue='';markChange(`替换图片：${file.name}`);panel=null;persist();repaint();
    }catch(_){issue='图片读取失败，请重新选择文件。';repaint();}
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='vsPrompt'){draft.prompt=e.target.value;dirty=true;persist();const el=document.getElementById('vsSaveStatus');if(el)el.textContent=saved?'草稿已保存':'草稿未保存';}
  });
  document.addEventListener('submit',e=>{
    if(e.target.id!=='vsTextForm')return;e.preventDefault();
    const values=new FormData(e.target);
    for(const [field,name]of [['title','标题'],['subtitle','说明'],['price','价格'],['dateText','展示时间']]){if(!values.has(field))continue;const next=String(values.get(field)).trim();if(next!==draft[field]){markChange(`${name}：${draft[field]||'空'} → ${next||'空'}`);draft[field]=next;}}
    panel=null;persist();repaint();hooks.toast?.('已更新');
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-vs]');if(!b)return;
    const action=b.dataset.vs;
    if(busy&&!['finish'].includes(action))return;
    if(action==='panel'){returnFocus=b.dataset.panel;panel=panel===returnFocus?null:returnFocus;repaint();}
    if(action==='voice')window.ZVoice?.toggle(b,document.getElementById('vsPrompt'));
    if(action==='close'){panel=null;repaint();document.querySelector(`[data-vs="panel"][data-panel="${returnFocus}"]`)?.focus();}
    if(action==='choose'){const {field,value}=b.dataset;if(choices[field]?.some(x=>x[0]===value)){panel=null;change(field,value);}}
    if(action==='reset')change(b.dataset.field,base[b.dataset.field]);
    if(action==='sample'){draft.asset=draft.scenario==='art'?'assets/art-atmosphere.svg':sample;draft.assetName=draft.scenario==='art'?'艺术示例':base.assetName;markChange('使用示例图片');panel=null;persist();repaint();}
    if(action==='save-version')saveVersion();
    if(action==='toggle-text'){draft.showText=!draft.showText;markChange(draft.showText?'显示画面文字':'隐藏画面文字');panel=null;persist();repaint();}
    if(action==='upload')picker.click();
    if(action==='generate')generate();
    if(action==='retry') {if(issue.startsWith('图片')||issue.startsWith('请选择'))picker.click();else generate();}
    if(action==='restore')restore(b.dataset.id);
    if(action==='previous'||action==='next'){const idx=versions.findIndex(v=>v.id===selected);restore(versions[(idx+(action==='next'?1:-1)+versions.length)%versions.length]?.id);}
    if(action==='play'){playing=!playing;repaint();}
    if(action==='preview')openPreview();
    if(action==='publish')publish();
    if(action==='finish'){hooks.closeSheet?.();hooks.navigate?.('home');}
  });
  document.addEventListener('keydown',e=>{
    const dialog=document.querySelector('.vs-tray');
    if(dialog){
      if(e.key==='Escape'){e.preventDefault();panel=null;repaint();document.querySelector(`[data-vs="panel"][data-panel="${returnFocus}"]`)?.focus();}
      if(e.key==='Tab'){
        const nodes=[...dialog.querySelectorAll('button:not(:disabled), input, textarea')],first=nodes[0],last=nodes.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
      return;
    }
    if(e.target.id==='vsPrompt'&&e.key==='Enter'&&!e.isComposing&&(e.metaKey||e.ctrlKey)){e.preventDefault();generate();}
  });
  let swipe=null;
  document.addEventListener('pointerdown',e=>{
    if(e.target.closest('.vs-canvas')&&!e.target.closest('button'))swipe={x:e.clientX,y:e.clientY};
  });
  document.addEventListener('pointerup',e=>{
    if(!swipe)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;
    if(busy||versions.length<2||Math.abs(dx)<55||Math.abs(dy)>35)return;
    const idx=versions.findIndex(v=>v.id===selected);restore(versions[(idx+(dx<0?1:-1)+versions.length)%versions.length]?.id);
  });
  document.addEventListener('pointercancel',()=>{swipe=null;});
  return {view,previewView,artwork,triggerGenerate(){if(!busy&&versions.length===0)generate();},init(options){hooks=options;},getPublished(){return published?copy(published):null;},clearPublished(){published=null;persist();hooks.cleared?.();},leave(){playing=false;persist();},
    getProject(){return copy({id:projectId,title:versions.at(-1)?.data.title||draft.title,type:'image',draft,versions,selected,dirty,pendingChanges});},
    forgetProject(id){if(projectId!==id)return;job++;busy=false;projectId=`project-${Date.now()}`;draft={...base};versions=[];selected=null;dirty=false;panel=null;pendingChanges=[];persist();},
    newProject(seed={}){if(busy){hooks.toast?.('请等待当前操作完成');return false;}projectId=`project-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;draft=sanitize({...base,...seed});versions=[];selected=null;pending=null;panel=null;dirty=true;issue='';playing=false;pendingChanges=[];persist();return true;},
    loadProject(p,options={}){if(busy){hooks.toast?.('请等待当前操作完成');return false;}projectId=p.id;versions=(p.versions||[]).map(v=>({...v,data:sanitize(v.data)}));selected=options.versionId||p.selected;const selectedVersion=versions.find(v=>v.id===selected);draft=options.versionId&&selectedVersion?copy(selectedVersion.data):sanitize(p.draft);dirty=options.versionId?false:!!p.dirty;pendingChanges=Array.isArray(p.pendingChanges)?p.pendingChanges:[];panel=null;pending=null;playing=false;issue='';persist(false);return true;}
  };
})();
