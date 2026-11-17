const siteEl=document.querySelector('#site'),stateEl=document.querySelector('#state'),toggleEl=document.querySelector('#toggle');
let host='',paused=false;
const render=()=>{siteEl.textContent=host||'this page';stateEl.textContent=paused?'Vim keys are paused here.':'Vim keys are active here.';stateEl.className=paused?'off':'on';toggleEl.textContent=paused?'Resume on this site':'Always pause on this site';toggleEl.disabled=!host};
const apply=r=>{if(r){host=r.host;paused=r.paused}render()};
chrome.runtime.sendMessage({action:'pause-state'},apply);
toggleEl.onclick=()=>chrome.runtime.sendMessage({action:'pause-toggle'},apply);
document.querySelector('#settings').onclick=()=>chrome.runtime.openOptionsPage();
chrome.storage.local.get(['updateAvailable','latestVersion'],v=>{if(v.updateAvailable){const el=document.querySelector('#update');el.style.display='block';el.querySelector('a').textContent=`version ${v.latestVersion}`}});
