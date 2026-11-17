(()=>{
// A reloaded extension re-injects this script. Dispatch first, so predecessors in this
// isolated world tear down (their globals survive the reload) and exactly one copy stays live.
document.dispatchEvent(new CustomEvent('vim-chromium-reset'));
const life=new AbortController(),sig={capture:true,signal:life.signal};
document.addEventListener('vim-chromium-reset',()=>life.abort(),{signal:life.signal});
const defaults={scrollDown:'j',scrollUp:'k',top:'g g',bottom:'G',back:'Ctrl+H',forward:'Ctrl+L',nextWindow:'Alt+J',previousWindow:'Alt+K',openSettings:'s'},pausedDefault=['leetcode.com','neetcode.io','coderpad.io'];
let keys={...defaults},pendingKey='',timer,docsNormal=false,yankLinewise=false,paused=true;
let topHost='';try{topHost=window.top.location.hostname}catch(_){}
const ancestors=[...(location.ancestorOrigins||[])].map(o=>{try{return new URL(o).hostname}catch(_){return ''}});
const hostList=[location.hostname,topHost,...ancestors].filter(Boolean).map(h=>h.toLowerCase());
const norm=s=>{let h=(s||'').trim().toLowerCase();const i=h.indexOf('://');if(i>=0)h=h.slice(i+3);h=h.split('/')[0].split('?')[0].split(':')[0];return h.startsWith('www.')?h.slice(4):h};
const blocked=list=>(list||[]).some(s=>{const site=norm(s);return site&&hostList.some(h=>h===site||h.endsWith('.'+site))});
const alive=()=>{try{return !!chrome.runtime?.id}catch(_){return false}};
chrome.storage.sync.get({...defaults,pausedSites:pausedDefault},v=>{const{pausedSites,...rest}=v;keys={...defaults,...rest};paused=blocked(pausedSites)});
chrome.storage.onChanged.addListener(c=>{for(const k of Object.keys(c)){if(k==='pausedSites')paused=blocked(c[k].newValue);else if(k in defaults)keys[k]=c[k].newValue}});
const docsAncestor=ancestors.includes('docs.google.com');
const inDocs=location.hostname==='docs.google.com'||location.hostname.endsWith('.googleusercontent.com')||topHost==='docs.google.com'||docsAncestor;
const key=e=>{const plain=e.key.length===1?e.key.toLowerCase():e.key;const implicit=e.shiftKey&&e.key.length===1&&e.key===e.key.toUpperCase();return `${e.ctrlKey?'Ctrl+':''}${e.altKey?'Alt+':''}${e.shiftKey&&!implicit?'Shift+':''}${e.metaKey?'Meta+':''}${implicit?e.key:plain}`};
const typing=e=>e.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.tagName),stop=e=>{e.preventDefault();e.stopPropagation()};
const docsDocument=()=>{try{return window.top.document}catch(_){return document}};
const viewport=()=>{if(!inDocs)return document.scrollingElement;const doc=docsDocument();const candidates=[...doc.querySelectorAll('.kix-appview-editor,.kix-appview-editor-container,[role="document"]')];return candidates.find(v=>v.scrollHeight>v.clientHeight)||doc.scrollingElement};
const docsScroll=(kind,amount=0)=>{if(window===window.top||docsDocument()!==document){const v=viewport();if(kind==='move')v.scrollBy({top:amount,behavior:'smooth'});else v.scrollTo({top:kind==='top'?0:v.scrollHeight,behavior:'smooth'});return}window.top.postMessage({type:'vim-chromium-docs-scroll',kind,amount},'*')};
if(window===window.top&&location.hostname==='docs.google.com')window.addEventListener('message',e=>{if(e.source===window||!e.data||e.data.type!=='vim-chromium-docs-scroll')return;const v=viewport();if(e.data.kind==='move')v.scrollBy({top:e.data.amount,behavior:'smooth'});else v.scrollTo({top:e.data.kind==='top'?0:v.scrollHeight,behavior:'smooth'})},{signal:life.signal});
const move=(amount)=>{if(inDocs)docsScroll('move',amount);else viewport().scrollBy({top:amount,behavior:'smooth'})};
const scrollDown=()=>move(Math.max(120,innerHeight*.4)),scrollUp=()=>move(-Math.max(120,innerHeight*.4));
const docsSeq=(source,seq,mode)=>{stop(source);chrome.runtime.sendMessage({action:'docs-keys',seq,mode})};
const docsMove=(source,keyName,mods={})=>docsSeq(source,[{key:keyName,...mods}]);
const docsInsert=(source,seq=[])=>{docsNormal=false;pendingKey='';docsSeq(source,seq,'insert')};
const copyKey={key:'c',ctrlKey:true,command:'copy'},cutKey={key:'x',ctrlKey:true,command:'cut'},pasteKey={key:'v',ctrlKey:true,command:'paste'};
const lineOps={y:[{key:'Home'},{key:'End',shiftKey:true},copyKey,{key:'Home'}],d:[{key:'Home'},{key:'End',shiftKey:true},cutKey,{key:'Delete'}]};
const inserts={i:[],a:[{key:'ArrowRight'}],I:[{key:'Home'}],A:[{key:'End'}],o:[{key:'End'},{key:'Enter'}],O:[{key:'Home'},{key:'Enter'},{key:'ArrowUp'}]};
function docsKey(e,k){if(!docsNormal){if(e.key==='Escape'||e.code==='CapsLock'){docsNormal=true;pendingKey='';stop(e);chrome.runtime.sendMessage({action:'docs-mode',enabled:true});return 'handled'}return 'blocked'}if(e.key==='Escape'||e.code==='CapsLock'){pendingKey='';stop(e);return 'handled'}if(pendingKey){const prev=pendingKey;clearTimeout(timer);pendingKey='';if(prev==='g'&&`g ${k}`===keys.top){docsMove(e,'Home',{ctrlKey:true});return 'handled'}if(lineOps[prev]){if(k===prev){yankLinewise=true;docsSeq(e,lineOps[prev])}else stop(e);return 'handled'}}if(inserts[k]){docsInsert(e,inserts[k]);return 'handled'}if(k==='p'){docsSeq(e,yankLinewise?[{key:'End'},{key:'Enter'},pasteKey]:[{key:'ArrowRight'},pasteKey]);return 'handled'}if(k==='P'){docsSeq(e,yankLinewise?[{key:'Home'},{key:'Enter'},{key:'ArrowUp'},pasteKey]:[pasteKey]);return 'handled'}if(lineOps[k]||(k==='g'&&keys.top==='g g')){pendingKey=k;timer=setTimeout(()=>pendingKey='',800);stop(e);return 'handled'}const motions={h:['ArrowLeft',{}],j:['ArrowDown',{}],k:['ArrowUp',{}],l:['ArrowRight',{}],w:['ArrowRight',{ctrlKey:true}],e:['ArrowRight',{ctrlKey:true}],b:['ArrowLeft',{ctrlKey:true}],'0':['Home',{}],'$':['End',{}],G:['End',{ctrlKey:true}]};if(motions[k]){docsMove(e,...motions[k]);return 'handled'}if(e.ctrlKey||e.altKey||e.metaKey){if(k==='Ctrl+c'||k==='Ctrl+x')yankLinewise=false;return 'command'}if(e.key.length===1){stop(e);return 'handled'}return 'command'}
document.addEventListener('keydown',e=>{if(!e.isTrusted||paused||!alive())return;const k=key(e);if(inDocs){const result=docsKey(e,k);if(result!=='command')return}if(!inDocs&&typing(e.target))return;const v=viewport();const a={scrollDown,scrollUp,top:()=>v.scrollTo({top:0,behavior:'smooth'}),bottom:()=>v.scrollTo({top:v.scrollHeight,behavior:'smooth'}),back:()=>history.back(),forward:()=>history.forward(),nextWindow:()=>chrome.runtime.sendMessage({action:'window',direction:'next'}),previousWindow:()=>chrome.runtime.sendMessage({action:'window',direction:'previous'}),openSettings:()=>chrome.runtime.sendMessage({action:'settings'})};for(const[n,f]of Object.entries(a))if(k===keys[n]){stop(e);f();return}},sig);
})();
