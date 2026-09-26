/* Local prototype asset collection. Documents are stored, never executed or falsely marked converted. */
window.ContentHub = (() => {
  const types=[['all','全部','layers'],['image','图片','image'],['video','视频','film'],['slides','PPT / PDF','presentation'],['word','Word','file-text'],['html','HTML','code-2']];
  const themes=[
    {id:'tpl-product',title:'让产品成为主角',scene:'gallery',style:'quiet',purpose:'product',subtitle:'产品介绍'},
    {id:'tpl-launch',title:'新品，值得被看见',scene:'studio',style:'bold',purpose:'launch',subtitle:'新品发布'},
    {id:'tpl-welcome',title:'欢迎每一次相遇',scene:'nature',style:'quiet',purpose:'welcome',subtitle:'欢迎画面'},
    {id:'tpl-event',title:'好时光，即将开始',scene:'kitchen',style:'warm',purpose:'event',subtitle:'活动预告'}
  ];
  let records=[], db=null, ready=false, storageError='', filter='all', query='', order='new', detailId=null, hooks={}, timer=null, importedFileType=null;
  let playback=null, publishing=false, favoritesOnly=false;
  const copy=value=>structuredClone(value);
  const urls=new Map();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const typeName=t=>types.find(x=>x[0]===t)?.[1]||t;
  const typeIcon=t=>types.find(x=>x[0]===t)?.[2]||'file';
  const formatDate=t=>new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric'}).format(new Date(t));
  const base=()=>({asset:'assets/studio-product.svg',assetName:'咖啡机示例',title:'每一杯，都刚刚好',subtitle:'智能研磨 · 静享醇香',price:'',purpose:'product',scene:'gallery',style:'quiet',motion:'none',prompt:''});
  const templateData=t=>({...base(),...t});
  function urlFor(record){const key=record.urlKey||record.id;if(!urls.has(key)&&record.blob)urls.set(key,URL.createObjectURL(record.blob));return urls.get(key)||'';}
  const versionOf=r=>r.project?.versions.at(-1);
  const canPresent=r=>r.project?!!versionOf(r):r.type==='image'||(r.type==='video'&&r.previewReady===true);
  const isCurrent=r=>playback?.sourceId===r.id&&(!r.project||playback.versionId===versionOf(r)?.id);
  function statusOf(r){const playing=isCurrent(r)?`${hooks.isPlaying?.()===false?'已暂停':'播放中'} · 演示`:'';if(playback?.sourceId===r.id&&r.project&&versionOf(r)?.id!==playback.versionId)return '有新版本';if(r.project?.dirty&&versionOf(r))return playing?`${playing} · 有修改`:'有未发布修改';return playing|| (r.project&&!versionOf(r)?'草稿':['slides','word','html'].includes(r.type)?'待处理':r.type==='video'&&!r.previewReady?'待检查':'');}
  function recent(){return `<div class="content-list quiet-list">${[...records].sort((a,b)=>b.updated-a.updated).slice(0,3).map(r=>`<button class="content-row" type="button" data-hub="open" data-id="${r.id}"><span class="ch-recent-cover">${media(r)}</span><span class="content-copy"><strong>${esc(r.title)}</strong>${statusOf(r)?`<span>${statusOf(r)}</span>`:''}</span><i data-lucide="chevron-right"></i></button>`).join('')||'<p class="ch-subtle">暂无内容</p>'}</div>`;}
  async function setPlayback(snapshot){
    if(!db)throw Error('存储不可用');
    const next={...copy(snapshot),id:'current',urlKey:`playback-${crypto.randomUUID()}`,publishedAt:Date.now()};
    await new Promise((resolve,reject)=>{const tx=db.transaction('playback','readwrite');tx.objectStore('playback').put(next);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    if(playback?.urlKey&&urls.has(playback.urlKey)){URL.revokeObjectURL(urls.get(playback.urlKey));urls.delete(playback.urlKey);}
    playback=next;hooks.onPlayback?.();
  }
  async function clearPlayback(){if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction('playback','readwrite');tx.objectStore('playback').delete('current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});playback=null;hooks.render?.();}
  async function setStudioPlayback(v){
    const record=records.find(r=>r.project?.versions.some(x=>x.id===v.id));
    await setPlayback({sourceId:v.projectId||record?.id||null,versionId:v.id,title:v.data.title,type:'image',data:copy(v.data)});
  }
  function playbackMedia(playing=false){if(!playback)return '';if(playback.data)return VisualStudio.artwork(playback.data,playing);return playback.type==='video'?`<video class="ch-screen-video" src="${esc(urlFor(playback))}" ${playing?'autoplay loop':''} muted playsinline controls aria-label="屏幕视频演示"></video>`:`<div class="ch-screen-image"><img src="${esc(urlFor(playback))}" alt="${esc(playback.title)}"/></div>`;}
  function nowPlaying(){return playback?`<button class="ch-now-playing" type="button" data-route="terminal" aria-label="控制当前播放"><span class="ch-now-cover">${playback.data?VisualStudio.artwork(playback.data,false,true):media(playback)}</span><span><small>${hooks.isPlaying?.()===false?'已暂停':'播放中'} · 演示</small><strong>${esc(playback.title)}</strong></span><i data-lucide="sliders-horizontal"></i></button>`:'';}
  function route(){return hooks.route?.()||'gallery';}
  function redraw(){if(['gallery','library','asset-detail'].includes(route()))hooks.render?.();}
  async function put(record){
    if(!db)throw Error('本地存储尚未就绪，请稍后重试。');
    await new Promise((resolve,reject)=>{const tx=db.transaction('items','readwrite');tx.objectStore('items').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    records=records.filter(x=>x.id!==record.id).concat(record);storageError='';
  }
  async function saveProject(){
    clearTimeout(timer);
    const p=VisualStudio.getProject();
    const previous=records.find(r=>r.id===p.id);
    if(!previous&&!p.dirty&&!p.versions.length)return true;
    if(previous&&JSON.stringify(previous.project)===JSON.stringify(p))return true;
    const record={...previous,id:p.id,title:previous?.renamed?previous.title:p.title||'未命名作品',type:'image',project:p,created:previous?.created||Date.now(),updated:Date.now()};
    try{await put(record);redraw();return true;}catch(_){storageError='作品尚未写入内容库，当前编辑草稿仍保留。请检查浏览器存储空间。';redraw();return false;}
  }
  function queueSave(){clearTimeout(timer);timer=setTimeout(saveProject,280);}
  async function init(options){
    hooks=options;
    try {
      db=await new Promise((resolve,reject)=>{const req=indexedDB.open('zrobot-content-hub',2);req.onupgradeneeded=()=>{for(const store of ['items','playback'])if(!req.result.objectStoreNames.contains(store))req.result.createObjectStore(store,{keyPath:'id'});};req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};req.onerror=()=>reject(req.error);req.onblocked=()=>{storageError='请关闭其他旧版原型页后刷新。';redraw();};});
      records=await new Promise((resolve,reject)=>{const req=db.transaction('items').objectStore('items').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
      playback=await new Promise((resolve,reject)=>{const req=db.transaction('playback').objectStore('playback').get('current');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});
      if(VisualStudio.getProject().versions.length)await saveProject();
      if(!playback&&VisualStudio.getPublished())await setStudioPlayback(VisualStudio.getPublished());
    }catch(_){storageError='本地存储不可用，导入暂不可用；仍可体验示例创作。';}
    ready=true;hooks.render?.();
  }
  function filters(){return `<div class="ch-filters" aria-label="内容类型">${types.map(([id,title])=>`<button type="button" data-hub="filter" data-value="${id}" aria-pressed="${filter===id}">${title}</button>`).join('')}</div>`;}
  function media(record){
    if(record.project)return VisualStudio.artwork(versionOf(record)?.data||record.project.draft,false);
    if(record.type==='image')return `<img src="${esc(urlFor(record))}" alt="${esc(record.title)}" class="ch-import-image"/>`;
    if(record.type==='video')return `<div class="ch-film"><i data-lucide="play"></i><span>${esc(record.ext||'VIDEO')}</span><div class="ch-film-lines"></div></div>`;
    return `<div class="ch-paper ${record.type}"><div class="ch-paper-header"><i data-lucide="${typeIcon(record.type)}"></i><span>${esc(record.ext||typeName(record.type))}</span></div><strong>${esc(record.title.replace(/\.[^.]+$/,''))}</strong><div class="ch-paper-lines"><b></b><b></b><b></b></div><small>${record.type==='html'?'网页文件':'文档资料'}</small></div>`;
  }
  function cards(items){return `<div class="ch-grid">${items.map(record=>`<article class="ch-card"><button class="ch-cover" type="button" data-hub="open" data-id="${record.id}" aria-label="打开 ${esc(record.title)}">${media(record)}<span class="ch-type">${typeName(record.type)}</span></button><div class="ch-card-caption"><button type="button" data-hub="open" data-id="${record.id}"><strong>${esc(record.title)}</strong></button><button type="button" class="ch-icon" data-hub="menu" data-id="${record.id}" aria-label="管理 ${esc(record.title)}"><i data-lucide="ellipsis"></i></button></div>${statusOf(record)?`<p class="${isCurrent(record)?'ch-playing-label':''}">${statusOf(record)}</p>`:''}<p class="ch-card-meta">${typeName(record.type)}${record.project?` · ${esc(CreationScenarios.name(record.project.draft.scenario))}`:''} · ${formatDate(record.updated)}</p></article>`).join('')}</div>`;}
  function visible(items){return items.filter(r=>(route()!=='library'||!favoritesOnly||r.favorite)&&(filter==='all'||r.type===filter)&&r.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a,b)=>order==='new'?b.updated-a.updated:a.updated-b.updated);}
  function header(title){return `<h1 class="vs-sr-only">${title}</h1>`;}
  function search(){return `<div class="ch-toolbar"><div class="ch-search"><i data-lucide="search"></i><input id="chSearch" aria-label="搜索内容" placeholder="搜索" value="${esc(query)}"/><button type="button" data-hub="sort" aria-label="切换排序"><i data-lucide="arrow-down-up"></i></button></div>${route()==='library'?`<button class="ch-icon" data-hub="favorites" type="button" aria-label="只看收藏" aria-pressed="${favoritesOnly}"><i data-lucide="star"></i></button>`:''}<button class="ch-icon" type="button" data-hub="import" aria-label="导入文件"><i data-lucide="upload"></i></button></div>`;}
  function empty(title,desc){return `<div class="ch-empty"><i data-lucide="${filter==='all'?'image-plus':typeIcon(filter)}"></i><h2>${title}</h2><p>${desc}</p><button class="ch-text" data-hub="new" type="button">新建或导入<i data-lucide="arrow-up-right"></i></button></div>`;}
  function history(){
    const r=records.find(x=>x.id===detailId);
    if(!r?.project)return `<section class="ch-page ch-history-page"><div class="ch-detail-head"><button class="ch-icon" data-route="gallery" type="button" aria-label="返回创作"><i data-lucide="chevron-left"></i></button></div><div class="ch-empty"><h2>作品不存在</h2></div></section>`;
    const versions=[...r.project.versions].reverse();
    return `<section class="ch-page ch-history-page"><div class="ch-detail-head"><button class="ch-icon" data-route="gallery" type="button" aria-label="返回创作"><i data-lucide="chevron-left"></i></button><span>创作</span><button class="ch-icon" data-hub="history-edit" data-id="${r.id}" type="button" aria-label="编辑当前版本"><i data-lucide="square-pen"></i></button></div><h1>版本历史</h1><p class="ch-history-title">${esc(r.title)}</p><div class="ch-history-list">${versions.map((v,i)=>`<button class="ch-history-version" type="button" data-hub="history-version" data-id="${r.id}" data-version="${v.id}" aria-label="编辑版本 ${v.number}">${VisualStudio.artwork(v.data,false,true)}<span><strong>版本 ${v.number}${v.id===r.project.selected?' · 当前':''}</strong><small>${esc(v.note||'已生成内容')}</small></span><i data-lucide="chevron-right"></i></button>`).join('')}</div><button class="ch-primary ch-history-edit" data-hub="history-edit" data-id="${r.id}" type="button">编辑当前版本</button></section>`;
  }
  function officialCards(items){return `<div class="ch-grid cs-gallery">${items.map(t=>`<article class="ch-card"><button type="button" class="ch-cover" data-hub="template" data-id="${t.id}" aria-label="使用 ${t.title}">${VisualStudio.artwork(templateData(t),false)}<span class="cs-glabel">${t.title}</span></button></article>`).join('')}</div>`;}
  const chips=[['产品介绍','介绍这款产品的核心卖点与使用场景'],['活动通知','宣布本周末的会员活动，突出时间与地点'],['欢迎接待','欢迎来访嘉宾，传递热情与专业'],['艺术氛围','生成一张纯净的艺术氛围画面']];
  const themePrompts={
    'tpl-product':'为「产品介绍」生成一张宣传画面。产品名称：[替换成产品名]；核心卖点：[一句话卖点]；产品在简约展台陈列，标题突出产品名称，风格简约克制。',
    'tpl-launch':'为「新品发布」生成一张发布主视觉。新品名称：[替换]；最大亮点：[一句话]；纯色空间聚焦产品，使用醒目的品牌色，风格鲜明。',
    'tpl-welcome':'为「欢迎接待」生成一张欢迎画面。欢迎对象：[来访嘉宾或活动名称]；欢迎语：[替换]；信息清晰简洁，传递热情与专业，风格简约。',
    'tpl-event':'为「活动预告」生成一张预告画面。活动主题：[替换]；时间地点：[替换]；暖光氛围营造好时光即将开始的感觉，风格温暖。'
  };
  async function quickCreate(){
    const input=document.getElementById('csComposerInput');
    const text=(input?.value||'').trim();
    if(!text){hooks.toast?.('先描述你想生成的画面');return;}
    if(!await saveProject()){hooks.toast?.(storageError);return;}
    const title=text.split(/[。；;！!？?\n]/)[0].trim().slice(0,18)||'未命名作品';
    const rest=text.slice(title.length).replace(/^[。；;！!？?\n\s]+/,'');
    const seed={scenario:'free',title,subtitle:rest.slice(0,60),prompt:text};
    if(VisualStudio.newProject(seed)){hooks.navigate('studio');setTimeout(()=>VisualStudio.triggerGenerate(),450);}
  }
  const ZVoice={
    active:null,
    toggle(btn,target){
      if(!btn||!target)return;
      if(this.active){this.stop();return;}
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(SR){
        const rec=new SR();rec.lang='zh-CN';rec.interimResults=true;
        const base=target.value;
        rec.onresult=e=>{let t='';for(const r of e.results)t+=r[0].transcript;target.value=(base?base.replace(/\s+$/,'')+' ':'')+t;};
        rec.onend=()=>this.stop();
        rec.onerror=()=>{this.stop();hooks.toast?.('没有听清，请再试一次');};
        this.active={rec,btn};btn.classList.add('listening');target.focus?.();
        try{rec.start();}catch(_){this.stop();}
      }else{
        hooks.toast?.('当前环境不支持语音识别，演示语音输入');
        btn.classList.add('listening');
        const demo='介绍我们的新品智能咖啡机，突出静音研磨';let i=0;target.value='';target.focus?.();
        const timer=setInterval(()=>{i+=1;target.value=demo.slice(0,i);if(i>=demo.length){clearInterval(timer);this.stop();}},85);
        this.active={btn,timer};
      }
    },
    stop(){const a=this.active;if(!a)return;if(a.rec)try{a.rec.stop();}catch(_){}if(a.timer)clearInterval(a.timer);a.btn?.classList.remove('listening');this.active=null;}
  };
  window.ZVoice=ZVoice;
  function gallery(){
    const works=[...records].filter(r=>r.project).sort((a,b)=>b.updated-a.updated);
    const feed=works.map(r=>{
      const v=versionOf(r),n=r.project.versions.length;
      return `<article class="cs-card${n>1?' stacked':''}"><button class="cs-card-img" type="button" data-hub="open" data-id="${r.id}" aria-label="继续编辑 ${esc(r.title)}">${VisualStudio.artwork(v?.data||r.project.draft,false)}${n>1?`<span class="cs-card-count"><i data-lucide="layers"></i>${n} 个版本</span>`:''}</button><p class="cs-card-title">${esc(r.title)}</p></article>`;
    }).join('');
    return `<section class="ch-page cs-page">${header('创作中心')}${works.length?`<div class="ch-section-title"><h2>我的创作</h2></div><div class="cs-grid">${feed}</div>`:''}<div class="ch-section-title"><h2>模板</h2></div>${officialCards(themes)}<div class="cs-chips" aria-label="灵感提示">${chips.map(([name,text])=>`<button type="button" data-hub="chip" data-value="${text}">${name}</button>`).join('')}</div><div class="cs-composer"><div class="cs-composer-pill"><button class="cs-attach" type="button" data-hub="import" aria-label="上传资料"><i data-lucide="plus"></i></button><input id="csComposerInput" type="text" placeholder="描述你想生成的画面…" maxlength="200" aria-label="描述你想生成的画面"/><button class="cs-attach cs-voice" type="button" data-hub="voice" aria-label="语音输入"><i data-lucide="mic"></i></button><button class="cs-send" type="button" data-hub="quick-create" aria-label="生成"><i data-lucide="arrow-up"></i></button></div></div></section>`;
  }
  function library(){const list=visible(records);return `<section class="ch-page ch-library">${header('内容库')}${nowPlaying()}${search()}${filters()}${storageError?`<p class="ch-warning" role="alert">${esc(storageError)}</p>`:''}<div id="chResults">${!ready?'<p class="ch-empty">加载中…</p>':list.length?cards(list):`<div class="ch-empty"><i data-lucide="library"></i><h2>${query?'未找到内容':'暂无内容'}</h2><button class="ch-primary" data-hub="import" type="button">导入内容</button><button class="ch-text" data-route="gallery" type="button">去创作</button></div>`}</div>${!ready||list.length?'':`<div class="ch-section-title"><h2>优质示例</h2><span class="ch-section-sub">不同应用场景 · 持续更新</span></div>${officialCards(themes)}`}</section>`;}
  function newSheet(){hooks.openSheet(`<div class="ch-sheet-head"><h2>从什么开始？</h2><button class="ch-icon" type="button" data-hub="close" aria-label="关闭"><i data-lucide="x"></i></button></div><p>选择内容类型，保留你的原始素材。</p><div class="ch-new-options">${types.slice(1).map(([id,name,icon])=>`<button type="button" data-hub="new-type" data-value="${id}"><i data-lucide="${icon}"></i><span><strong>${name}</strong><small>${{image:'上传产品图，或从画布开始',video:'导入视频，或制作画面动效',slides:'导入演示文稿或PDF',word:'导入文字资料',html:'导入网页文件'}[id]}</small></span><i data-lucide="chevron-right"></i></button>`).join('')}</div>`);}
  function importFile(type=null){importedFileType=type;picker.accept={image:'.jpg,.jpeg,.png,.webp',video:'.mp4,.webm',slides:'.ppt,.pptx,.pdf',word:'.doc,.docx',html:'.html,.htm'}[type]||'.jpg,.jpeg,.png,.webp,.mp4,.webm,.ppt,.pptx,.pdf,.doc,.docx,.html,.htm';picker.click();}
  async function startProject(seed){if(!await saveProject()){hooks.toast(storageError);return;}hooks.closeSheet();if(VisualStudio.newProject(seed))hooks.navigate('studio');}
  async function createFromTemplate(t){if(t)await startProject(templateData(t));}
  async function open(id){if(route()==='gallery'&&!await saveProject()){hooks.toast(storageError);return;}const record=records.find(r=>r.id===id);if(!record)return;if(record.project&&route()==='gallery'){if(VisualStudio.loadProject(record.project))hooks.navigate('studio');}else{detailId=id;hooks.navigate('asset-detail');}}
  function detail(){
    const r=records.find(x=>x.id===detailId);if(!r)return `<div class="ch-empty"><h2>内容已移除</h2><button class="ch-text" data-route="library" type="button">返回内容库</button></div>`;
    const documentType=['slides','word','html'].includes(r.type),draft=r.project&&!versionOf(r);
    const primary=documentType?`<button class="ch-primary" data-hub="conversion" data-id="${r.id}" type="button">准备上屏</button>`:draft?`<button class="ch-primary" data-hub="edit" data-id="${r.id}" type="button">继续创作</button>`:isCurrent(r)?'<button class="ch-primary" data-route="terminal" type="button">控制播放</button>':`<button class="ch-primary" data-hub="publish" data-id="${r.id}" type="button" ${!canPresent(r)||publishing?'disabled':''}>${playback?'替换当前内容':'上屏演示'}</button>`;
    return `<section class="ch-page ch-preview-page"><div class="ch-detail-head"><button class="ch-icon" data-route="library" type="button" aria-label="返回内容库"><i data-lucide="chevron-left"></i></button><span>${typeName(r.type)}</span><button class="ch-icon" data-hub="menu" data-id="${r.id}" type="button" aria-label="管理内容"><i data-lucide="ellipsis"></i></button></div><h1 class="ch-detail-title">${esc(r.title)}</h1><div class="ch-detail-preview ${!documentType?'ch-display-frame':''}">${r.type==='video'?`<video data-preview-id="${r.id}" controls playsinline preload="auto" src="${esc(urlFor(r))}" aria-label="视频预览"></video>`:media(r)}</div>
      ${documentType?'<p class="ch-readiness">待处理 · 原文件已保存</p>':draft?'<p class="ch-readiness">草稿 · 生成后可上屏</p>':`<p class="ch-readiness">${r.type==='video'?'视频预览检查中…':`16:9${r.project?` · 版本 ${versionOf(r).number}`:' · 完整显示'}`}</p>`}
      ${r.project?.dirty&&versionOf(r)?'<p class="ch-subtle">预览为已生成版本，草稿修改未发布。</p>':''}
      <div class="ch-preview-actions">${!draft&&!documentType?'<p class="ch-subtle">我的智显屏 · 演示，未连接设备</p>':''}${primary}</div></section>`;
  }
  async function publishRecord(r){
    if(publishing||!canPresent(r))return;
    if(hooks.isOnline?.()===false){hooks.toast('设备离线，请连接后重试');return;}
    publishing=true;
    const v=versionOf(r),snapshot={sourceId:r.id,title:r.title,type:r.type,...(v?{versionId:v.id,data:copy(v.data)}:{blob:r.blob,ext:r.ext})};
    hooks.openSheet('<h2>上屏演示中…</h2><p>完成后切换，当前内容保持播放。</p>');
    try{
      await new Promise(resolve=>setTimeout(resolve,650));
      await setPlayback(snapshot);
      hooks.openSheet('<div class="success-mark"><i data-lucide="check"></i></div><h2>上屏演示完成</h2><button class="ch-primary" type="button" data-hub="show-screen">查看屏幕</button>');
    }catch(_){hooks.openSheet('<h2>未能完成上屏</h2><p>当前播放未改变，请重试。</p><button class="ch-primary" data-hub="close" type="button">返回</button>');}
    finally{publishing=false;}
  }
  async function imageCreate(record){const reader=new FileReader();reader.onload=()=>{if(VisualStudio.newProject({asset:reader.result,assetName:record.title,title:record.title.replace(/\.[^.]+$/,'').slice(0,36)}))hooks.navigate('studio');};reader.readAsDataURL(record.blob);}
  const picker=document.createElement('input');picker.type='file';picker.hidden=true;picker.id='hubFileInput';document.body.append(picker);
  document.addEventListener('loadeddata',async e=>{
    const el=e.target;if(!el.matches?.('video[data-preview-id]'))return;
    const r=records.find(x=>x.id===el.dataset.previewId);if(!r)return;
    r.previewReady=true;
    try{await put({...r,previewReady:true});}catch(_){hooks.toast('检查结果未保存，请重试');}
    if(detailId!==r.id||route()!=='asset-detail')return;
    const status=document.querySelector('.ch-readiness');if(status)status.textContent='可预览 · 上屏适配待设备接入验证';
    const button=document.querySelector('[data-hub="publish"]');if(button)button.disabled=false;
  },true);
  document.addEventListener('error',e=>{
    const el=e.target;if(!el.matches?.('video[data-preview-id]'))return;
    const r=records.find(x=>x.id===el.dataset.previewId);if(r){r.previewReady=false;put(r).catch(()=>{});}
    const status=document.querySelector('.ch-readiness');if(status)status.textContent='无法预览，请更换视频或等待转码';
    const button=document.querySelector('[data-hub="publish"]');if(button)button.disabled=true;
  },true);
  picker.addEventListener('change',async()=>{
    const file=picker.files?.[0];picker.value='';if(!file)return;
    const ext=file.name.split('.').pop().toLowerCase(), type={jpg:'image',jpeg:'image',png:'image',webp:'image',mp4:'video',webm:'video',ppt:'slides',pptx:'slides',pdf:'slides',doc:'word',docx:'word',html:'html',htm:'html'}[ext];
    if(!type||(importedFileType&&type!==importedFileType)){hooks.toast('请选择对应类型的文件');return;}
    if(file.size>(type==='image'?5:20)*1024*1024){hooks.toast(`文件过大：图片限5MB，其他文件限20MB`);return;}
    hooks.closeSheet();
    try {
      let blob=file;
      if(type==='image'){
        const img=await createImageBitmap(file);img.close();
      }
      const id=crypto.randomUUID(),record={id,title:file.name,filename:file.name,ext:ext.toUpperCase(),type,blob,created:Date.now(),updated:Date.now()};
      await put(record);filter='all';query='';detailId=id;hooks.navigate('asset-detail');
    }catch(_){storageError='文件保存失败，请检查格式和浏览器可用空间，再重新导入。';hooks.toast(storageError);redraw();}
  });
  function assistant(){hooks.openSheet(`<div class="ch-sheet-head"><h2>让表达更清楚</h2><button class="ch-icon" data-hub="close" type="button" aria-label="关闭"><i data-lucide="x"></i></button></div><p>针对当前作品补充要求，确认后再继续创作。</p><div class="ch-assist-options">${['标题更简短，保留产品名称','突出一个核心卖点','把介绍整理成30秒讲解稿'].map(t=>`<button type="button" data-hub="assist-prompt" data-value="${t}">${t}<i data-lucide="arrow-up-right"></i></button>`).join('')}</div><p>当前为交互原型，选择只填写要求，不调用模型或扣费。</p>`);}
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-hub]');if(!b)return;const a=b.dataset.hub,r=records.find(x=>x.id===b.dataset.id);
    if(a==='new')hooks.openSheet(CreationScenarios.sheet());
    if(a==='free-create')newSheet();
    if(a==='scenario')hooks.openSheet(CreationScenarios.form(b.dataset.value));
    if(a==='favorites'){favoritesOnly=!favoritesOnly;redraw();}
    if(a==='favorite'&&r){try{await put({...r,favorite:!r.favorite});hooks.closeSheet();redraw();}catch(_){hooks.toast('收藏未保存，请重试');}}
    if(a==='close')hooks.closeSheet();
    if(a==='filter'){filter=b.dataset.value;redraw();}
    if(a==='chip'){const input=document.getElementById('csComposerInput');if(input){input.value=b.dataset.value;input.focus();}}
    if(a==='quick-create')await quickCreate();
    if(a==='voice')ZVoice.toggle(b,document.getElementById('csComposerInput'));
    if(a==='templates')hooks.openSheet(`<div class="ch-sheet-head"><h2>示例模板</h2><button class="ch-icon" data-hub="close" type="button" aria-label="关闭"><i data-lucide="x"></i></button></div>${officialCards(themes)}`);
    if(a==='sort'){order=order==='new'?'old':'new';redraw();}
    if(a==='import')importFile();
    if(a==='new-type'){
      const type=b.dataset.value;
      if(type==='image'||type==='video')hooks.openSheet(`<div class="ch-sheet-head"><h2>${type==='image'?'新建图片':'新建视频'}</h2><button class="ch-icon" data-hub="close" type="button" aria-label="关闭"><i data-lucide="x"></i></button></div><div class="ch-new-options"><button type="button" data-hub="blank" data-value="${type}"><i data-lucide="sparkles"></i><span><strong>${type==='image'?'从画布开始':'让图片动起来'}</strong><small>${type==='image'?'示例画布，可替换素材':'动效预览，MP4导出待接入'}</small></span></button><button type="button" data-hub="import-type" data-value="${type}"><i data-lucide="upload"></i><span><strong>导入${type==='image'?'图片':'视频'}</strong><small>选择自己的本地文件</small></span></button></div>`);
      else importFile(type);
    }
    if(a==='import-type')importFile(b.dataset.value);
    if(a==='blank')await startProject(b.dataset.value==='video'?{motion:'push'}:{showText:false});
    if(a==='template'){const t=themes.find(x=>x.id===b.dataset.id);const input=document.getElementById('csComposerInput');if(t&&input){input.value=themePrompts[t.id]||t.title;input.focus();input.scrollIntoView({block:'center'});}}
    if(a==='open')open(b.dataset.id);
    if(a==='history-version'&&r?.project){if(VisualStudio.loadProject(r.project,{versionId:b.dataset.version}))hooks.navigate('studio');}
    if(a==='history-edit'&&r?.project){if(VisualStudio.loadProject(r.project))hooks.navigate('studio');}
    if(a==='publish'&&r)await publishRecord(r);
    if(a==='show-screen'){hooks.closeSheet();hooks.navigate('home');}
    if(a==='edit'&&r){hooks.closeSheet();if(r.project){if(VisualStudio.loadProject(r.project))hooks.navigate('studio');}else if(r.type==='image')imageCreate(r);}
    if(a==='image-create'&&r)imageCreate(r);
    if(a==='download'&&r?.blob){const link=document.createElement('a');link.href=urlFor(r);link.download=r.filename;link.click();}
    if(a==='conversion'&&r)hooks.openSheet(`<h2>${typeName(r.type)}如何上屏</h2><ol class="ch-convert-steps"><li>保存原文件</li><li>${r.type==='word'?'提炼并确认关键内容':r.type==='html'?'安全检查与离线资源处理':'转换为逐页画面'}</li><li>预览16:9展示效果</li><li>确认后发布到屏幕</li></ol><p>此原型尚未接入转换服务，原文件已保留。</p><button class="ch-primary" data-hub="close" type="button">知道了</button>`);
    if(a==='menu'&&r)hooks.openSheet(`<div class="ch-sheet-head"><h2>更多</h2><button class="ch-icon" data-hub="close" type="button" aria-label="关闭"><i data-lucide="x"></i></button></div><button class="ch-text" data-hub="favorite" data-id="${r.id}" type="button">${r.favorite?'取消收藏':'收藏'}</button>${r.project||r.type==='image'?`<button class="ch-text" data-hub="edit" data-id="${r.id}" type="button">${r.project?'编辑内容':'创作副本'}</button>`:''}<form id="hubRename" data-id="${r.id}"><label>名称<input name="title" required maxlength="80" value="${esc(r.title)}"/></label><button class="ch-primary" type="submit">保存名称</button></form>${r.blob?`<button class="ch-text" data-hub="download" data-id="${r.id}" type="button">导出原文件</button>`:''}<button class="ch-text danger" type="button" data-hub="delete-confirm" data-id="${r.id}">删除内容</button>`);
    if(a==='delete-confirm'&&r)hooks.openSheet(`<h2>删除这件内容？</h2><p>${esc(r.title)}将从本地内容库移除，已发布演示快照保留。</p><div class="button-row"><button class="secondary-button" data-hub="close" type="button">取消</button><button class="ch-primary" data-hub="delete" data-id="${r.id}" type="button">确认删除</button></div>`);
    if(a==='delete'&&r){try{clearTimeout(timer);await new Promise((resolve,reject)=>{const tx=db.transaction('items','readwrite');tx.objectStore('items').delete(r.id);tx.oncomplete=resolve;tx.onerror=reject;});records=records.filter(x=>x.id!==r.id);VisualStudio.forgetProject(r.id);if(urls.has(r.id)){URL.revokeObjectURL(urls.get(r.id));urls.delete(r.id);}hooks.closeSheet();hooks.navigate('library');}catch(_){hooks.toast('删除失败，请重试');}}
    if(a==='assistant')assistant();
    if(a==='assist-prompt'){hooks.closeSheet();const input=document.getElementById('vsPrompt');if(input){input.value=b.dataset.value;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();input.scrollIntoView({block:'center'});}}
  });
  document.addEventListener('submit',async e=>{if(e.target.id==='scenarioForm'){e.preventDefault();const seed=CreationScenarios.seed(new FormData(e.target),e.target.dataset.scenario);if(seed)await startProject(seed);else hooks.toast('请填写名称和说明');return;}if(e.target.id!=='hubRename')return;e.preventDefault();const r=records.find(x=>x.id===e.target.dataset.id);const title=new FormData(e.target).get('title').trim();if(!r||!title)return;try{await put({...r,title,renamed:true,updated:Date.now()});hooks.closeSheet();redraw();}catch(_){hooks.toast('保存失败，请重试');}});
  document.addEventListener('input',e=>{if(e.target.id!=='chSearch')return;query=e.target.value;const pos=e.target.selectionStart;redraw();const input=document.getElementById('chSearch');input?.focus();input?.setSelectionRange(pos,pos);});
  document.addEventListener('keydown',e=>{if(e.target.id==='csComposerInput'&&e.key==='Enter'&&!e.isComposing){e.preventDefault();quickCreate();}});
  return {init,gallery,library,detail,history,recent,queueSave,flushSave(){clearTimeout(timer);return saveProject();},saveProject,count:()=>records.length,playbackMedia,getPlayback:()=>playback?copy(playback):null,setStudioPlayback,clearPlayback};
})();
