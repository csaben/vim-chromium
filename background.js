const defaults={scrollDown:'j',scrollUp:'k',top:'g g',bottom:'G',back:'Ctrl+H',forward:'Ctrl+L',nextWindow:'Alt+J',previousWindow:'Alt+K',openSettings:'s'},pausedDefault=['leetcode.com','neetcode.io','coderpad.io'];
const updateUrl='https://github.com/csaben/vim-chromium',repoManifest='https://raw.githubusercontent.com/csaben/vim-chromium/main/manifest.json';
let updateFlag=false,pausedCache=pausedDefault,injected=false;
const norm=s=>{let h=(s||'').trim().toLowerCase();const i=h.indexOf('://');if(i>=0)h=h.slice(i+3);h=h.split('/')[0].split('?')[0].split(':')[0];return h.startsWith('www.')?h.slice(4):h};
const hostOf=u=>{try{const x=new URL(u);return x.protocol==='http:'||x.protocol==='https:'?x.hostname.toLowerCase():''}catch(_){return ''}};
const isPaused=h=>pausedCache.some(s=>{const site=norm(s);return site&&(h===site||h.endsWith('.'+site))});
const activeTab=async()=>(await chrome.tabs.query({active:true,currentWindow:true}))[0];
async function setPaused(host,on){const h=norm(host),base=pausedCache.map(norm).filter(Boolean);const list=on?[...new Set([...base,h])]:base.filter(s=>!(h===s||h.endsWith('.'+s)));pausedCache=list;await chrome.storage.sync.set({pausedSites:list})}
async function togglePause(){const t=await activeTab();if(!t)return null;const h=hostOf(t.url||'');if(!h)return null;const on=!isPaused(h);await setPaused(h,on);if(on&&t.id!=null)await setDocsMode(t.id,false).catch(()=>{});allBadges();return{host:h,paused:on}}
async function badge(tabId,url){const h=hostOf(url||''),off=!!h&&isPaused(h);try{await chrome.action.setBadgeText({tabId,text:updateFlag?'UPD':off?'off':''});await chrome.action.setBadgeBackgroundColor({tabId,color:updateFlag?'#d93025':'#5f6368'})}catch(_){}}
async function allBadges(){try{for(const t of await chrome.tabs.query({}))if(t.id!=null)badge(t.id,t.url)}catch(_){}}
chrome.tabs.onActivated.addListener(async a=>{try{const t=await chrome.tabs.get(a.tabId);badge(t.id,t.url)}catch(_){}});
chrome.tabs.onUpdated.addListener((id,info,tab)=>{if(info.url||info.status==='complete')badge(id,tab.url)});
chrome.storage.sync.get({pausedSites:pausedDefault},v=>{pausedCache=v.pausedSites||[];allBadges()});
chrome.storage.onChanged.addListener(c=>{if(c.pausedSites){pausedCache=c.pausedSites.newValue||[];allBadges()}});
chrome.runtime.onInstalled.addListener(async()=>{const cur=await chrome.storage.sync.get(null),miss={};for(const k in defaults)if(cur[k]===undefined)miss[k]=defaults[k];if(cur.pausedSites===undefined)miss.pausedSites=pausedDefault;if(Object.keys(miss).length)await chrome.storage.sync.set(miss)});
chrome.commands.onCommand.addListener(async c=>{if(c==='open-settings'){chrome.runtime.openOptionsPage();return}if(c==='toggle-pause')await togglePause()});
async function checkUpdate(){try{const r=await fetch(repoManifest,{cache:'no-store'}),m=await r.json();updateFlag=m.version!==chrome.runtime.getManifest().version;await chrome.storage.local.set({updateAvailable:updateFlag,latestVersion:m.version,updateUrl});allBadges()}catch(_){}}
async function diskVersion(){try{const r=await fetch(chrome.runtime.getURL('manifest.json'),{cache:'no-store'});return (await r.json()).version}catch(_){return null}}
async function selfRefresh(){if(attached.size)return;const running=chrome.runtime.getManifest().version,disk=await diskVersion();
  const local=await chrome.storage.local.get(['latestVersion','reloadAt']),fresh=disk&&disk!==running;
  const target=fresh?disk:(local.latestVersion&&local.latestVersion!==running?local.latestVersion:null);if(!target)return;
  if(local.reloadAt&&Date.now()-local.reloadAt<(fresh?60000:1800000))return;
  await chrome.storage.local.set({reloadAt:Date.now()});chrome.runtime.reload()}
async function injectAll(){if(injected)return;injected=true;try{for(const t of await chrome.tabs.query({url:['http://*/*','https://*/*']}))if(t.id!=null)try{await chrome.scripting.executeScript({target:{tabId:t.id,allFrames:true},files:['content.js']})}catch(_){}}catch(_){}}
chrome.runtime.onInstalled.addListener(()=>{checkUpdate();injectAll()});chrome.runtime.onStartup.addListener(()=>{checkUpdate();injectAll()});
chrome.alarms.create('update-check',{periodInMinutes:60});chrome.alarms.create('self-refresh',{periodInMinutes:5});
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='update-check')checkUpdate();if(a.name==='self-refresh')selfRefresh()});
checkUpdate();injectAll();selfRefresh();
async function moveWindow(d){const c=await chrome.windows.getCurrent(),w=(await chrome.windows.getAll({windowTypes:['normal']})).filter(x=>x.id!==c.id).sort((a,b)=>a.id-b.id);if(!w.length)return;const i=w.findIndex(x=>x.id>c.id),t=d==='next'?w[i<0?0:i]:w[i<0?w.length-1:Math.max(0,i-1)];await chrome.windows.update(t.id,{focused:true})}
const attached=new Set();
async function setDocsMode(tabId,enabled){const target={tabId};if(enabled&&!attached.has(tabId)){await chrome.debugger.attach(target,'1.3');attached.add(tabId)}else if(!enabled&&attached.has(tabId)){await chrome.debugger.detach(target);attached.delete(tabId)}}
const codes={ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Home:36,End:35,Enter:13,Backspace:8,Delete:46,Tab:9},texts={Enter:String.fromCharCode(13)};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function dispatchKey(target,m){const single=m.key.length===1,vk=codes[m.key]??(single?m.key.toUpperCase().charCodeAt(0):0),text=!m.ctrlKey&&!m.altKey&&!m.metaKey&&texts[m.key]||'';
  const base={key:m.key,code:single?`Key${m.key.toUpperCase()}`:m.key,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,modifiers:(m.altKey?1:0)|(m.ctrlKey?2:0)|(m.metaKey?4:0)|(m.shiftKey?8:0)};
  const down={type:m.command||text?'keyDown':'rawKeyDown',...base};if(text){down.text=text;down.unmodifiedText=text}if(m.command)down.commands=[m.command];
  await chrome.debugger.sendCommand(target,'Input.dispatchKeyEvent',down);await chrome.debugger.sendCommand(target,'Input.dispatchKeyEvent',{type:'keyUp',...base})}
async function sendDocsKeys(tabId,seq,mode){const target={tabId};if(seq&&seq.length){await setDocsMode(tabId,true);for(let i=0;i<seq.length;i++){if(i)await pause(25);await dispatchKey(target,seq[i])}}if(mode==='insert'){await pause(25);await setDocsMode(tabId,false)}}
chrome.debugger.onDetach.addListener(source=>{if(source.tabId)attached.delete(source.tabId)});
chrome.runtime.onMessage.addListener((m,s,send)=>{if(m.action==='window'){moveWindow(m.direction).then(()=>send({ok:true}));return true}if(m.action==='settings'){chrome.runtime.openOptionsPage();return}if(m.action==='pause-state'){activeTab().then(t=>{const h=hostOf(t?.url||'');send({host:h,paused:!!h&&isPaused(h)})});return true}if(m.action==='pause-toggle'){togglePause().then(r=>send(r||{host:'',paused:false}));return true}if(m.action==='docs-mode'&&s.tab?.id){setDocsMode(s.tab.id,m.enabled).then(()=>send({ok:true})).catch(e=>send({ok:false,error:e.message}));return true}if(m.action==='docs-keys'&&s.tab?.id){sendDocsKeys(s.tab.id,m.seq,m.mode).then(()=>send({ok:true})).catch(e=>send({ok:false,error:e.message}));return true}});
