'use strict';
const $=id=>document.getElementById(id);
let sites=[],departures=[],forecast=null,selected=null,loadedAt=0,request=0;
const clock=ms=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit'}).format(ms);
// SL timestamps have no offset: interpret in Stockholm, not the visitor's timezone.
function slTime(value){
 if(!value)return NaN;
 if(/Z$|[+-]\d\d:\d\d$/.test(value))return Date.parse(value);
 const base=Date.parse(value+'Z');let guess=base;
 for(let i=0;i<3;i++){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(guess).map(p=>[p.type,p.value]));
  const local=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
  guess=base-(local-guess);
 }return guess;
}
async function get(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),15000);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error('Service unavailable');return await r.json();}finally{clearTimeout(timer);}}
function key(d){return JSON.stringify([d.line.id,d.direction_code,d.destination]);}
function usable(ds,now=Date.now()){return ds.filter(d=>d.line?.transport_mode==='BUS'&&d.state!=='CANCELLED'&&!d.deviations?.some(x=>x.consequence==='CANCELLED')&&slTime(d.expected||d.scheduled)>now).sort((a,b)=>slTime(a.expected||a.scheduled)-slTime(b.expected||b.scheduled));}
function stops(){const q=$('stop-search').value.trim().toLocaleLowerCase();$('stop').replaceChildren(new Option('Choose a stop',''));for(const s of sites.filter(s=>(s.name+' '+(s.note||'')).toLocaleLowerCase().includes(q)).slice(0,100))$('stop').add(new Option(s.name+(s.note?' — '+s.note:''),s.id));}
async function init(){ $('retry').hidden=true;$('status').textContent='Loading SL stops…';try{const data=await get('https://transport.integration.sl.se/v1/sites');if(!Array.isArray(data))throw Error();sites=data.filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&(!s.valid?.to||slTime(s.valid.to)>Date.now())).sort((a,b)=>a.name.localeCompare(b.name,'sv'));stops();$('stop').disabled=false;$('status').textContent='Search for a stop, then select it. Up to 100 matching stops are shown.';}catch{$('status').textContent='Could not load SL stops. Check your connection and retry.';$('retry').hidden=false;}}
function clearResult(){ $('result').hidden=true;}
async function load(){const id=$('stop').value;if(!id)return;const ticket=++request;selected=sites.find(s=>String(s.id)===id);const site=selected,oldRoute=$('route').value;clearResult();$('route').disabled=true;$('refresh').disabled=true;$('status').textContent='Fetching departures and weather…';forecast=null;departures=[];
 const weatherURL=new URL('https://api.open-meteo.com/v1/forecast');weatherURL.search=new URLSearchParams({latitude:site.lat,longitude:site.lon,hourly:'temperature_2m,precipitation_probability',forecast_days:'2',timeformat:'unixtime'});
 const results=await Promise.allSettled([get('https://transport.integration.sl.se/v1/sites/'+id+'/departures'),get(weatherURL)]);
 if(ticket!==request)return;
 $('refresh').disabled=false;
 if(results.some(r=>r.status==='rejected')){$('status').textContent='Could not retrieve '+(results[0].status==='rejected'?'SL departures':'weather')+'. No recommendation available. Click Update to retry.';return;}
 const [sl,w]=results.map(r=>r.value);if(!Array.isArray(sl.departures)||!Array.isArray(w.hourly?.time)){$('status').textContent='Incomplete service response. Please update to retry.';return;}
 departures=usable(sl.departures);forecast=w;loadedAt=Date.now();$('route').replaceChildren(new Option('Choose a bus and destination',''));const seen=new Set();for(const d of departures){const k=key(d);if(!seen.has(k)){$('route').add(new Option(d.line.designation+' → '+d.destination,k));seen.add(k);}}
 $('route').disabled=!departures.length;
 if(!departures.length){$('status').textContent='No upcoming, non-cancelled buses returned for this stop. Try another stop or update later.';return;}
 if(seen.has(oldRoute))$('route').value=oldRoute;
 $('status').textContent='Departures loaded. Choose a bus and destination.';
 if($('route').value)render();
}
function render(){clearResult();if(!forecast||!$('route').value||!$('walking').checkValidity())return;
 if(Date.now()-loadedAt>60000){$('status').textContent='Data is over a minute old. Click Update for fresh departures.';return;}
 const d=usable(departures).find(d=>key(d)===$('route').value);if(!d){$('status').textContent='This departure has passed. Click Update for new departures.';return;}
 const now=Date.now(),h=forecast.hourly,i=h.time.findIndex(t=>t*1000>=now);const temp=h.temperature_2m?.[i],rain=h.precipitation_probability?.[i];if(i<0||!Number.isFinite(temp)||!Number.isFinite(rain)){$('status').textContent='Forecast unavailable for the upcoming hour. Please update.';return;}
 const minutes=Math.ceil((slTime(d.expected||d.scheduled)-now)/60000),walking=Number($('walking').value);let title='Compare your options',reason='Check the forecast and next bus, then choose what suits your journey.';
 if(rain>=60&&minutes<=10){title='Consider the bus';reason='Rain is likely and a bus in your chosen direction is due within 10 minutes.';}else if(rain<30&&temp>=10&&temp<=25&&walking<=20){title='Consider walking';reason='The forecast is mild with a low precipitation probability, and your estimated walk is 20 minutes or less.';}
 $('suggestion').textContent=title;$('reason').textContent=reason;$('weather').textContent=`${temp} °C · ${rain}% precipitation probability · forecast for ${clock(h.time[i]*1000)} (Stockholm)`;
 $('bus').textContent=`${selected.name}: ${d.line.designation} → ${d.destination}. ${d.expected?'Expected':'Scheduled'} ${clock(slTime(d.expected||d.scheduled))}, in about ${minutes} min. Stop ${d.stop_point?.designation||'not specified'}.`;
 $('walk').textContent=walking+' minutes (your estimate)';$('updated').textContent='Retrieved at '+clock(loadedAt)+' Stockholm time. Sources: SL Transport and Open-Meteo. Update before travelling.';
 $('alerts').textContent=(d.deviations||[]).map(x=>x.message).filter(Boolean).join('\n');$('result').hidden=false;$('status').textContent='Comparison ready. SL service notices, if present, are shown in their original language.';
}
$('stop-search').addEventListener('input',()=>{request++;selected=null;forecast=null;clearResult();stops();$('route').replaceChildren(new Option('Choose a stop first',''));$('route').disabled=true;$('refresh').disabled=true;});
$('stop').addEventListener('change',()=>{if(!$('stop').value){request++;clearResult();$('refresh').disabled=true;$('route').disabled=true;return;} $('route').value='';load();});
$('route').addEventListener('change',render);$('walking').addEventListener('input',render);
$('journey').addEventListener('submit',e=>{e.preventDefault();load();});
// Refresh still works after a previous API failure leaves the route unavailable.
$('refresh').formNoValidate=true;
$('retry').addEventListener('click',init);
setInterval(()=>{if(!$('result').hidden&&Date.now()-loadedAt>60000){clearResult();$('status').textContent='Data is over a minute old. Click Update for current departures.';}},5000);
init();
