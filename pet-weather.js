// 主頁與舒壓頁共用即時天氣；只在使用者點定位時請求位置。
(()=>{
  'use strict';
  const $=id=>document.getElementById(id),stage=$('petStage'),body=$('petBody');if(!stage||!body)return;
  const preview=stage.dataset.weatherPreview==='true',memory=new Map();
  const weatherStore={getItem:k=>{if(preview)return memory.get(k)||null;try{return localStorage.getItem(k);}catch{return null;}},setItem:(k,v)=>{if(preview){memory.set(k,v);return;}try{localStorage.setItem(k,v);}catch{}}};
  const HOME={lat:22.6273,lon:120.3014,name:'高雄'},cities=[HOME,{lat:25.033,lon:121.5654,name:'台北'},{lat:24.1477,lon:120.6736,name:'台中'},{lat:22.9997,lon:120.227,name:'台南'},{lat:24.8039,lon:120.9647,name:'新竹'},{lat:23.9739,lon:121.6015,name:'花蓮'}];
  const PLACE='daily-wx-place',CACHE='daily-wx';let seq=0,controller=null,lastSuccess=0;
  const validPlace=p=>p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180&&typeof p.name==='string';
  function place(){try{const p=JSON.parse(weatherStore.getItem(PLACE));return validPlace(p)?p:HOME;}catch{return HOME;}}
  function savePlace(p){try{weatherStore.setItem(PLACE,JSON.stringify(p));}catch{}}
  const details=document.createElement('details');details.className='pet-weather-settings';
  details.innerHTML='<summary>天氣與地點</summary><div class="pet-weather-tools"><label>查看地點 <select id="petWeatherCity" aria-label="天氣地點"></select></label><button type="button" id="petWeatherGPS">使用目前位置</button><button type="button" id="petWeatherRefresh">更新天氣</button></div><p id="petWeatherStatus" role="status" aria-live="polite">正在讀取天氣…</p><p class="pet-weather-source">資料來源：<a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>。今日降雨機率為預報，場景依目前天氣代碼顯示。</p>';
  stage.after(details);
  const select=$('petWeatherCity');
  function paintPlaces(){select.replaceChildren();const p=place();for(const city of cities){const option=document.createElement('option');option.value=city.name;option.textContent=city.name;select.append(option);}if(!cities.some(c=>c.name===p.name)){const option=document.createElement('option');option.value=p.name;option.textContent=p.name;select.append(option);}select.value=p.name;}
  function classify(code){if(code===0||code===1)return ['☀️','晴朗','clear'];if(code===2)return ['⛅','局部多雲','partly'];if(code===3)return ['☁️','陰天','cloudy'];if(code===45||code===48)return ['🌫️','有霧','fog'];if([71,73,75,77,85,86].includes(code))return ['🌨️','降雪','snow'];if([95,96,99].includes(code))return ['⛈️','雷雨','storm'];if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return ['🌧️','下雨','rain'];return ['🌡️','未知天氣','unknown'];}
  const el=(name,cls,text)=>{const e=document.createElement(name);e.className=cls;if(text)e.textContent=text;return e;};
  function draw(w){
    stage.dataset.wx=w.kind;stage.dataset.night=String(w.night);stage.dataset.hot=String(w.hot);stage.dataset.cold=String(w.cold);stage.dataset.wind=String(w.wind>=30);
    let layer=stage.querySelector('.wx-layer');if(!layer){layer=el('div','wx-layer');layer.setAttribute('aria-hidden','true');stage.prepend(layer);}layer.replaceChildren();
    if(w.kind==='clear'||w.kind==='partly')layer.append(el('span',w.night?'wx-moon':'wx-sun'));
    if(!['clear','unknown'].includes(w.kind))for(let i=0;i<(w.kind==='partly'?2:3);i++)layer.append(el('span','wx-cloud c'+i));
    if(['rain','storm'].includes(w.kind))layer.append(el('span','wx-rainfall'));
    if(w.kind==='storm')layer.append(el('span','pet-weather-lightning','ϟ'));
    if(w.kind==='snow')layer.append(el('span','wx-snowfall'));
    if(w.kind==='fog')layer.append(el('span','wx-fog'));
    if(w.night)for(let i=0;i<5;i++){const st=el('span','wx-star','✦');st.style.left=8+i*19+'%';st.style.top=10+i%2*12+'%';layer.append(st);}
    if(w.wind>=30)layer.append(el('span','pet-weather-wind','〰 〰'));
    body.querySelectorAll('.pet-weather-prop').forEach(e=>e.remove());
    const prop=el('span','pet-weather-prop');prop.setAttribute('aria-hidden','true');
    if(['rain','storm'].includes(w.kind)){
      prop.classList.add('pet-weather-umbrella');prop.innerHTML='<svg viewBox="0 0 200 150"><path d="M100 18C52 18 14 52 10 92Q28 77 46 92Q64 77 82 92Q100 77 118 92Q136 77 154 92Q172 77 190 92C186 52 148 18 100 18Z" fill="#e5aaa4" stroke="#a96963" stroke-width="4"/><path d="M100 18Q72 52 82 92M100 18Q128 52 118 92M100 92V135Q100 148 88 140" fill="none" stroke="#aa7770" stroke-width="4" stroke-linecap="round"/></svg>';
    }else if(w.cold){prop.classList.add('pet-weather-blanket');prop.innerHTML='<svg viewBox="0 0 160 60"><path d="M10 15Q80 0 150 15L145 53Q80 43 15 53Z" fill="#c3b3cc" stroke="#a68eae" stroke-width="2"/><path d="M30 13V50M65 8V47M100 8V47M135 13V50M13 30H148" stroke="#eee5ef" stroke-width="3" opacity=".8"/></svg>';
    }else if(w.hot){prop.classList.add('pet-weather-fan');prop.innerHTML='<svg viewBox="0 0 70 100"><path d="M35 59V87M21 91H49" stroke="#a8b6a6" stroke-width="7" stroke-linecap="round"/><circle cx="35" cy="33" r="27" fill="#d9e8d6" stroke="#9bb294" stroke-width="3"/><g class="fan-blades" fill="#a3c0a0"><ellipse cx="35" cy="22" rx="8" ry="15"/><ellipse cx="35" cy="22" rx="8" ry="15" transform="rotate(120 35 33)"/><ellipse cx="35" cy="22" rx="8" ry="15" transform="rotate(240 35 33)"/></g><circle cx="35" cy="33" r="5" fill="#fff6df"/></svg>';
    }else if(w.rain>=50){prop.classList.add('pet-weather-spare');prop.textContent='☂';}
    if(prop.innerHTML)body.append(prop);
  }
  function message(w){if(w.stale)return '這是稍早的天氣資料，連線恢復後會重新更新。';if(w.kind==='storm')return '外面有雷雨，我們先待在屋裡放鬆。';if(w.kind==='rain')return '正在下雨，出門記得帶傘，我陪你聽雨。';if(w.kind==='snow')return '外面下雪了，記得保暖。';if(w.cold)return '天氣比較冷，披一條小毯子，暖暖再出門。';if(w.hot)return '天氣好熱，吹吹風，也記得補充水分！';if(w.night)return '天色暗了，今天辛苦了，早點休息吧。';if(w.wind>=30)return '風比較大，出門小心帽子和隨身物品。';if(w.rain>=50)return '今天比較可能下雨，先把傘放在旁邊。';return '今天'+w.desc+'，和我一起慢慢度過。';}
  function apply(data,p,stale=false){
    const c=data?.current,d=data?.daily;
    if(!c||!Number.isFinite(c.temperature_2m)||!Number.isFinite(c.weather_code)||![0,1].includes(c.is_day))throw Error('天氣資料不完整');
    const [icon,desc,kind]=classify(c.weather_code),temp=c.temperature_2m,night=c.is_day===0;
    const w={icon,desc,kind,temp,night,hot:temp>=30&&!night,cold:temp<=15,wind:Number(c.wind_speed_10m)||0,rain:Number(d?.precipitation_probability_max?.[0])||0,place:p.name,stale,time:String(c.time||''),restPose:'idle'};
    w.restPose=night?'sleep':w.cold?'pet':kind==='storm'?'curious':w.hot?'stretch':['clear','partly'].includes(kind)?'smile':'idle';
    w.text=message(w);window.dailyWeather=w;draw(w);window.dispatchEvent(new CustomEvent('daily-weather',{detail:w}));
    const chip=$('wxChip');if(chip){chip.textContent=`${icon} ${p.name} ${Math.round(temp)}°${stale?' · 舊資料':''}`;chip.title=`${desc}；今日最高降雨機率 ${w.rain}%；${w.time.replace('T',' ')}`;chip.setAttribute('aria-label',chip.title+'，點選聽天氣提醒');}
    const hi=d?.temperature_2m_max?.[0],lo=d?.temperature_2m_min?.[0];
    $('petWeatherStatus').textContent=`${p.name}｜${desc} ${Math.round(temp)}°C${Number.isFinite(c.apparent_temperature)?'，體感 '+Math.round(c.apparent_temperature)+'°C':''}${Number.isFinite(hi)&&Number.isFinite(lo)?'；今日 '+Math.round(lo)+'–'+Math.round(hi)+'°C':''}；今日最高降雨機率 ${w.rain}%。${stale?'目前離線，顯示稍早資料。':'資料時間：'+w.time.replace('T',' ')+'（所在地時間）。'} ${w.text}`;
  }
  async function refresh(force=false){
    const p=place(),ticket=++seq;controller?.abort();controller=new AbortController();const requestController=controller;paintPlaces();let cache;try{cache=JSON.parse(weatherStore.getItem(CACHE)||'null');}catch{}
    const matching=cache&&cache.lat===p.lat&&cache.lon===p.lon;
    if(!force&&matching&&Date.now()-cache.t<1800000){try{apply(cache.d,p);lastSuccess=cache.t;return;}catch{}}
    $('petWeatherStatus').textContent='正在更新 '+p.name+' 的天氣…';const timeout=setTimeout(()=>requestController.abort(),12000);
    try{
      const params=new URLSearchParams({latitude:String(p.lat),longitude:String(p.lon),current:'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',timezone:'auto',forecast_days:'1'});
      const response=await fetch('https://api.open-meteo.com/v1/forecast?'+params,{signal:requestController.signal});if(!response.ok)throw Error('連線失敗');const d=await response.json();if(ticket!==seq)return;apply(d,p);lastSuccess=Date.now();try{weatherStore.setItem(CACHE,JSON.stringify({t:lastSuccess,lat:p.lat,lon:p.lon,d}));}catch{}
    }catch(e){if(ticket!==seq)return;if(matching&&Date.now()-cache.t<21600000){try{apply(cache.d,p,true);return;}catch{}}
      window.dailyWeather=null;draw({kind:'unknown',night:false,hot:false,cold:false,wind:0,rain:0});window.dispatchEvent(new CustomEvent('daily-weather',{detail:null}));if($('wxChip'))$('wxChip').textContent='天氣暫時無法讀取';$('petWeatherStatus').textContent='讀不到天氣，先用一般場景。請確認網路後按「更新天氣」。';
    }finally{clearTimeout(timeout);}
  }
  function locate(){if(!navigator.geolocation){$('petWeatherStatus').textContent='此瀏覽器不支援定位，可手動選擇城市。';details.open=true;return;}
    $('petWeatherStatus').textContent='等待定位權限…';navigator.geolocation.getCurrentPosition(pos=>{savePlace({lat:+pos.coords.latitude.toFixed(3),lon:+pos.coords.longitude.toFixed(3),name:'目前位置'});refresh(true);},()=>{$('petWeatherStatus').textContent='沒有取得定位，保留原地點。也可以手動選擇城市。';details.open=true;},{timeout:10000,maximumAge:600000});}
  select.addEventListener('change',()=>{const p=cities.find(c=>c.name===select.value);if(p){savePlace(p);refresh(true);}});
  $('petWeatherGPS').onclick=locate;if($('wxLocate'))$('wxLocate').onclick=locate;$('petWeatherRefresh').onclick=()=>refresh(true);
  if($('wxChip'))$('wxChip').onclick=()=>{details.open=true;const w=window.dailyWeather;if(w)window.dailyPet?.play('smile',{text:w.text,hold:4500});};
  const slot=document.querySelector('[data-pet-picker]');if(slot&&window.dailyTheme?.mascots){const label=el('label','pet-animal-picker','小夥伴 '),picker=document.createElement('select');picker.setAttribute('aria-label','選擇互動動物');for(const animal of window.dailyTheme.mascots){const o=document.createElement('option');o.value=animal.id;o.textContent=animal.name;picker.append(o);}picker.value=window.dailyTheme.mascot()?.id||'bunny';picker.onchange=()=>window.dailyTheme.setMascot(picker.value);window.addEventListener('daily-mascot',()=>{picker.value=window.dailyTheme.mascot()?.id||'bunny';});label.append(picker);slot.append(label);}
  window.addEventListener('storage',e=>{if([PLACE,CACHE].includes(e.key))refresh(false);});
  window.addEventListener('online',()=>refresh(false));document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastSuccess>1800000)refresh(false);});
  setInterval(()=>{if(!document.hidden)refresh(false);},1800000);refresh(false);
})();
