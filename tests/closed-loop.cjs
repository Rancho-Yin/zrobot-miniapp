/* 全功能闭环测试：登录授权 / 新手引导 / 创作 / 版本 / 上屏 / 助手 / 积分 / 删除撤销 / 内容库 / 深色模式 */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/ranchoyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:4174/miniapp-prototype/index.html';
const credits=()=>Number(localStorage.getItem('zrobot-credits-v1'));
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
const p=await browser.newPage({viewport:{width:390,height:900}});
const errors=[];p.on('pageerror',e=>errors.push(e.message));global.failPage=p;
await p.addInitScript(()=>{try{localStorage.setItem('zrobot-noapi','1')}catch(_){}});
const step=async(name,fn)=>{process.stdout.write('· '+name+' ... ');try{await fn();console.log('OK');}catch(e){console.log('FAIL');throw e;}};
let pass=0;
await step('01 拒绝登录 → 访客进入首页，不写用户信息',async()=>{
  await p.goto(url+'?login=wechat');
  await p.locator('.wx-allow').waitFor({timeout:4000});
  assert.match(await p.locator('.wx-apply').innerText(),/申请获取/);
  assert.equal(await p.locator('.wx-perm').count(),2);
  await p.locator('.wx-deny').click();
  await p.getByRole('button',{name:'更换内容'}).waitFor({timeout:3000});
  assert.equal(await p.evaluate(()=>localStorage.getItem('zrobot-user')),null);
});
await step('02 允许授权（手机号+头像昵称）→ 极简三步引导',async()=>{
  await p.goto(url+'?login=wechat');
  await p.locator('.wx-allow').waitFor({timeout:4000});
  await p.locator('.wx-allow').click();
  await p.locator('.ob-intro').waitFor({timeout:5000});
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('zrobot-user')).name),'微信用户');
});
await step('03 开始体验 → 生成界面（纯净 Hero + 引导条 0/3）',async()=>{
  await p.getByRole('button',{name:'开始体验',exact:true}).click();
  await p.locator('.cs-hero-title').waitFor({timeout:3000});
  assert.match(await p.locator('.cs-hero-title').innerText(),/想创作什么/);
  assert.match(await p.locator('.ob-strip').innerText(),/0\/3/);
});
await step('04 一句话生成（模拟）→ 版本 1 → 扣 2 积分 → 引导 1/3',async()=>{
  await p.locator('#csComposerInput').fill('闭环测试 · 生成画面');
  await p.locator('[data-hub="quick-create"]').click();
  await p.locator('#vsPrompt').waitFor({timeout:3000});
  await p.waitForFunction(()=>VisualStudio.getProject().versions.length===1,null,{timeout:5000});
  assert.equal(await p.evaluate(()=>Number(localStorage.getItem('zrobot-credits-v1'))),18);
});
await step('05 改信息 + 保存版本 → 版本 2（编辑不扣积分）',async()=>{
  await p.locator('[data-vs="panel"][data-panel="more"]').click();
 await p.locator('.vs-tray [data-vs="panel"][data-panel="text"]').click();
  await p.locator('#vsTextForm [name="title"]').fill('闭环作品');
  await p.getByRole('button',{name:'完成',exact:true}).click();
  await p.getByRole('button',{name:'保存版本',exact:true}).click();
  assert.equal(await p.evaluate(()=>VisualStudio.getProject().versions.length),2);
  assert.equal(await p.evaluate(()=>Number(localStorage.getItem('zrobot-credits-v1'))),18);
});
await step('06 上屏演示 → 引导闭环完成弹层（3/3）',async()=>{
  await p.getByRole('button',{name:'返回创作',exact:true}).click();
  await p.locator('.cs-card').first().waitFor({timeout:2500});
  await p.locator('.tab[data-route="library"]').click();
  await p.locator('.ch-cover').first().click();
  await p.getByRole('button',{name:'上屏演示',exact:true}).click();
  await p.getByRole('heading',{name:'你已完成第一次上屏'}).waitFor({timeout:5000});
  const d=await p.evaluate(()=>JSON.parse(localStorage.getItem('zrobot-onboard')));
  assert.equal(d.done,true);
  await p.getByRole('button',{name:'查看屏幕',exact:true}).click();
});
await step('07 助手「开始讲解」→ 语音球 + 状态卡',async()=>{
  await p.locator('#asInput').fill('开始讲解');
  await p.locator('[data-action="as-send"]').click();
  await p.locator('.orb-layer .orb').waitFor({timeout:4000});
  await p.locator('[data-action="orb-close"]').click();
  const card=await p.locator('.as-status-card').first().innerText();
  assert.match(card,/讲解\s*进行中/);assert.match(card,/播放\s*播放中/);
});
await step('08 球内继续对话：音量/章节指令 → 状态卡数值变化',async()=>{
  await p.locator('#asInput').fill('音量小一点');
  await p.locator('[data-action="as-send"]').click();
  await p.waitForFunction(()=>{const c=[...document.querySelectorAll('.as-status-card')];return c.length&&/42%/.test(c[c.length-1].innerText)},null,{timeout:4000});
  await p.locator('#asInput').fill('下一章节');
  await p.locator('[data-action="as-send"]').click();
  await p.waitForFunction(()=>{const c=[...document.querySelectorAll('.as-status-card')];return c.length&&/2\s*\/\s*3/.test(c[c.length-1].innerText)},null,{timeout:4000});
});
await step('09 积分不足 → 引导充值 → 充值 60 → 恢复可用',async()=>{
  await p.evaluate(()=>localStorage.setItem('zrobot-credits-v1','0'));
  await p.locator('.tab[data-route="gallery"]').click();
  await p.locator('.ch-fab').click();
  await p.locator('#csComposerInput').fill('充值后第一次生成');
  await p.locator('[data-hub="quick-create"]').click();
  await p.locator('#vsPrompt').waitFor({timeout:3000});
  await p.getByText('积分不足').waitFor({timeout:3000});
  await p.getByRole('button',{name:'去充值',exact:true}).click();
  await p.locator('.cr-plan').first().waitFor({timeout:3000});
  await p.locator('.cr-plan').first().click();
  assert.equal(await p.evaluate(()=>Number(localStorage.getItem('zrobot-credits-v1'))),60);
  await p.locator('.tab[data-route="gallery"]').click();
  await p.locator('.ch-fab').click();
  await p.locator('#csComposerInput').fill('充值后生成');
  await p.locator('[data-hub="quick-create"]').click();
  await p.waitForFunction(()=>VisualStudio.getProject().versions.length===1,null,{timeout:8000});
  assert.equal(await p.evaluate(()=>Number(localStorage.getItem('zrobot-credits-v1'))),58);
});
await step('10 重命名 → 标题即时更新',async()=>{
  await p.getByRole('button',{name:'返回创作',exact:true}).click();
  await p.locator('.ch-fab').waitFor({timeout:2500});
  await p.locator('.tab[data-route="library"]').click();
  await p.locator('.ch-cover').first().click();
  await p.getByRole('button',{name:'管理内容',exact:true}).click();
  await p.locator('#hubRename input').fill('重命名作品');
  await p.getByRole('button',{name:'保存名称',exact:true}).click();
  await p.getByRole('heading',{name:'重命名作品'}).waitFor({timeout:3000});
});
await step('11 搜索与类型筛选',async()=>{
  await p.getByRole('button',{name:'返回内容库',exact:true}).click();
  await p.locator('#chSearch').fill('重命名');
  await p.waitForTimeout(300);
  assert.equal(await p.locator('.ch-card').count(),1);
  await p.locator('#chSearch').fill('');
  await p.waitForTimeout(300);
  await p.getByRole('button',{name:'视频',exact:true}).click();
  const n=await p.locator('.ch-card').count();
  assert.equal(n,1);
  await p.getByRole('button',{name:'全部',exact:true}).click();
});
await step('12 删除 → 撤销恢复 → 再删不撤销 → 消失',async()=>{
  const before=await p.locator('.ch-card').count();
  await p.locator('.ch-cover').first().click();
  await p.getByRole('button',{name:'管理内容',exact:true}).click();
  await p.getByRole('button',{name:'删除内容',exact:true}).click();
  await p.locator('#toast button',{hasText:'撤销'}).waitFor({timeout:3000});
  await p.locator('#toast button').click();
  await p.waitForFunction(n=>document.querySelectorAll('.ch-card').length===n,before,{timeout:3000});
  assert.equal(await p.locator('.ch-card').count(),before);
  await p.locator('.ch-cover').first().click();
  await p.getByRole('button',{name:'管理内容',exact:true}).click();
  await p.getByRole('button',{name:'删除内容',exact:true}).click();
  await p.waitForTimeout(5500);
  assert.equal(await p.locator('.ch-card').count(),before-1);
});
await step('13 深色模式：跟随设置 + 刷新持久',async()=>{
  await p.evaluate(()=>localStorage.setItem('zrobot-theme','dark'));
  await p.reload();await p.waitForTimeout(500);
  assert.equal(await p.evaluate(()=>document.querySelector('.phone').getAttribute('data-theme')),'dark');
  await p.evaluate(()=>localStorage.setItem('zrobot-theme','light'));
  await p.reload();await p.waitForTimeout(300);
  assert.equal(await p.evaluate(()=>document.querySelector('.phone').getAttribute('data-theme')),'light');
});
await step('14 无横向溢出、无页面错误',async()=>{
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
});
console.log(JSON.stringify({viewport:390,status:'PASS',coverage:['consent deny/allow','intro carousel','onboard loop','generate+credits','versions','publish','status card','volume/chapter','insufficient→recharge','rename','search/filter','delete+undo','dark mode']}));
}catch(e){
  if(global.failPage){await global.failPage.screenshot({path:'/tmp/closed-FAIL.png',fullPage:true}).catch(()=>{});console.log('FAIL state url:',global.failPage.url());}
  throw e;
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
