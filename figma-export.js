/* Figma export only. Run on isolated localhost:4175; never seeds the normal prototype origin. */
(async()=>{
 if(location.port!=='4175'){document.getElementById('export-status').textContent='请使用独立设计端口 4175';return;}
 const frame=document.getElementById('source-frame');await new Promise(resolve=>frame.contentDocument?.readyState==='complete'?resolve():frame.addEventListener('load',resolve,{once:true}));
 const w=frame.contentWindow,d=w.document,screens=[];
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(100);}throw Error('等待页面超时');}
 function click(sel){const node=d.querySelector(sel);if(!node)throw Error('未找到 '+sel);node.click();}
 async function shot(name){await wait(120);d.getElementById('toast').hidden=true;await Promise.all([...d.images].map(i=>i.decode().catch(()=>{})));const n=d.querySelector('.phone').cloneNode(true);n.setAttribute('aria-label',name);n.querySelectorAll('input,textarea').forEach(el=>{const original=el.id?d.getElementById(el.id):null;if(original){if(el.tagName==='TEXTAREA')el.textContent=original.value;else el.setAttribute('value',original.value);}});n.querySelectorAll('[hidden]').forEach(el=>el.remove());const article=document.createElement('article');article.className='export-screen';article.id='screen-'+String(screens.length+1).padStart(2,'0');const h=document.createElement('h2');h.textContent=name;article.append(h,n);screens.push(article);}
 async function generate(seed){w.VisualStudio.newProject(seed);w.navigate('studio');click('[data-vs="generate"]');await until(()=>w.VisualStudio.getProject().versions.length>0);await w.ContentHub.saveProject();}
 async function upload(name,mime,bytes){w.navigate('library');const transfer=new w.DataTransfer();transfer.items.add(new w.File([bytes],name,{type:mime}));const input=d.getElementById('hubFileInput');input.files=transfer.files;input.dispatchEvent(new w.Event('change',{bubbles:true}));await until(()=>!!d.querySelector('.ch-detail-title')&&d.querySelector('.ch-detail-title').textContent===name);}
 try{
  await until(()=>!d.getElementById('chResults')?.textContent.includes('加载中'));
  w.navigate('library');await shot('12 内容库 · 空状态');
  w.VisualStudio.newProject();w.navigate('studio');await shot('02 创作 · 描述画面');
  click('[data-vs="generate"]');await until(()=>w.VisualStudio.getProject().versions.length===1);
  click('[data-vs="panel"][data-panel="more"]');click('[data-panel="style"]');click('[data-vs="choose"][data-value="warm"]');click('[data-vs="generate"]');await until(()=>w.VisualStudio.getProject().versions.length===2);await w.ContentHub.saveProject();
  await shot('03 创作 · 生成结果');
  click('[data-vs="panel"][data-panel="more"]');click('[data-panel="text"]');await shot('04 创作 · 轻量编辑');click('[data-vs="close"]');
  const first=w.VisualStudio.getProject();
  await generate({title:'新品，值得被看见',subtitle:'新品发布',style:'bold',scene:'studio',purpose:'launch'});
  await generate({title:'欢迎每一次相遇',subtitle:'欢迎光临',scene:'nature',purpose:'welcome'});
  w.navigate('gallery');await shot('01 创作 · 作品');
  await upload('产品介绍.pdf','application/pdf','%PDF-1.4\n%%EOF');await shot('08 文档 · 待处理');
  w.navigate('library');click(`[data-hub="open"][data-id="${first.id}"]`);await shot('06 内容 · 预览上屏');
  click('[data-hub="publish"]');await until(()=>!!d.querySelector('[data-hub="show-screen"]'));await shot('07 上屏 · 完成反馈');click('[data-hub="show-screen"]');
  w.navigate('library');await shot('05 内容库 · 播放优先');
  w.navigate('home');await shot('09 屏幕 · 当前播放');
  w.navigate('terminal');await shot('10 屏幕 · 遥控');
  w.navigate('profile');await shot('11 我的');
  screens.sort((a,b)=>a.querySelector('h2').textContent.localeCompare(b.querySelector('h2').textContent,'zh-CN',{numeric:true}));
  document.getElementById('export-grid').append(...screens);
  document.getElementById('export-status').remove();document.body.dataset.ready='true';
  if(location.hash.includes('figmacapture=')){const script=document.createElement('script');script.src='https://mcp.figma.com/mcp/html-to-design/capture.js';script.async=true;document.head.append(script);}
 }catch(e){document.getElementById('export-status').textContent=e.message;console.error(e);}
})();
