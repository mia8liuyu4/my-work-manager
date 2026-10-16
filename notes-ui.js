// 筆記分類欄收合
(()=>{const ws=document.getElementById('workspace'),t=document.getElementById('catToggle'),rail=document.getElementById('catRail'),cur=document.getElementById('catCurrent');
const set=c=>{ws.classList.toggle('cats-collapsed',c);t.setAttribute('aria-expanded',String(!c));try{localStorage.setItem('notes-cats-collapsed',c?'1':'')}catch{}};
let c=false;try{c=!!localStorage.getItem('notes-cats-collapsed')}catch{}set(c);
t.onclick=()=>set(true);rail.onclick=()=>set(false);
const upd=()=>{const s=document.querySelector('#sections .selected');cur.textContent=s?(matchMedia('(max-width:640px)').matches?s.textContent:[...s.textContent.slice(0,8)].join('\n')):''};new MutationObserver(upd).observe(document.getElementById('sections'),{childList:true,subtree:true,attributes:true});upd();})();
