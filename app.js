const LOCATIONS = ["Rummelsbg", "Hof", "München", "Pegnitz", "Pegnitz 008", "Cham"];
const YEAR_GOAL = 1370001;
const BONUS = [{value:1.2, rate:750}, {value:2, rate:801}, {value:2.3, rate:851}, {value:2.6, rate:951}];
const storeKey = "dmi-tagesbericht-v1";
let state = JSON.parse(localStorage.getItem(storeKey) || '{"entries":[]}');
let cloud = null;

const $ = s => document.querySelector(s);
const number = n => new Intl.NumberFormat("de-DE").format(Math.round(n || 0));
const dateText = d => new Intl.DateTimeFormat("de-DE", {day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${d}T12:00:00`));
const today = new Date().toLocaleDateString("en-CA", {timeZone:"Europe/Berlin"});
const calc = entry => {
  const total = LOCATIONS.reduce((sum, location) => sum + Number(entry.locations?.[location] || 0), 0);
  const rate = entry.hours ? total / Number(entry.hours) : 0;
  const bonus = [...BONUS].reverse().find(level => rate >= level.rate)?.value || 0;
  return {...entry, total, rate, bonus, target: Number(entry.hours || 0) * 801};
};
function saveLocal(){localStorage.setItem(storeKey, JSON.stringify(state));}
function entries(){return state.entries.map(calc).sort((a,b)=>b.date.localeCompare(a.date));}
function upsert(entry){const i=state.entries.findIndex(e=>e.date===entry.date); if(i>-1) state.entries[i]=entry; else state.entries.push(entry); saveLocal(); render(); pushCloud(entry);}
function removeEntry(date){state.entries=state.entries.filter(e=>e.date!==date);saveLocal();render(); if(cloud) cloud.from("dmi_daily_reports").delete().eq("report_date",date);}

function render(){
  const all=entries(), current=calc(state.entries.find(e=>e.date===today) || {date:today,hours:7.25,locations:{}});
  const yearTotal=all.filter(e=>e.date.startsWith("2026")).reduce((s,e)=>s+e.total,0), progress=Math.min(100,yearTotal/YEAR_GOAL*100), diff=current.total-current.target;
  $("#year-progress").textContent=`${progress.toFixed(1).replace(".",",")} %`;
  $("#year-detail").textContent=`${number(yearTotal)} von ${number(YEAR_GOAL)} Stück`;
  $(".progress-ring").style.setProperty("--progress",`${progress}%`); $("#ring-value").textContent=`${Math.round(progress)}%`;
  $("#kpi-today").textContent=number(current.total); $("#kpi-target").textContent=number(current.target); $("#kpi-diff").textContent=`${diff>=0?"+":"−"}${number(Math.abs(diff))}`; $("#kpi-diff").style.color=diff>=0?"var(--teal)":"var(--danger)";
  $("#kpi-rest").textContent=number(Math.max(0,YEAR_GOAL-yearTotal)); $("#diff-label").textContent=diff>=0?"über dem Ziel":"zum Ziel";
  const max=Math.max(...LOCATIONS.map(l=>current.locations?.[l]||0),1); $("#location-bars").innerHTML=LOCATIONS.map(l=>`<div class="location-row"><span>${l}</span><div class="bar-track"><div class="bar-fill" style="width:${(current.locations?.[l]||0)/max*100}%"></div></div><span>${number(current.locations?.[l]||0)}</span></div>`).join("");
  const level=[...BONUS].reverse().find(b=>current.rate>=b.rate)?.value || 0; document.querySelectorAll(".bonus-scale div").forEach(el=>el.classList.toggle("active",Number(el.dataset.bonus)===level));
  $("#bonus-text").textContent=level?`Bonus-Stufe ${String(level).replace(".",",")} erreicht · ${number(current.rate)} Stück/h`:`Noch ${number(Math.max(0,750*current.hours-current.total))} Stück bis Stufe 1,2`;
  $("#recent-list").innerHTML=all.slice(0,4).map(e=>`<div class="recent-item"><span>${dateText(e.date)}</span><strong>${number(e.total)} Stück</strong></div>`).join("") || '<p class="muted">Noch keine Tagesberichte erfasst.</p>';
  $("#history-body").innerHTML=all.map(e=>`<tr><td>${dateText(e.date)}</td><td>${String(e.hours).replace(".",",")} h</td><td>${number(e.total)}</td><td>${number(e.rate)}</td><td>${e.bonus?String(e.bonus).replace(".",","):"—"}</td><td><button class="delete-button" data-delete="${e.date}">Löschen</button></td></tr>`).join("") || '<tr><td colspan="6">Noch keine Einträge vorhanden.</td></tr>';
}
function setView(view){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===view));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$("#page-title").textContent={dashboard:"Übersicht",entry:"Tagesbericht",history:"Verlauf"}[view];$(".sidebar").classList.remove("open");if(view==="entry") loadForm(today);}
function loadForm(date){const item=state.entries.find(e=>e.date===date) || {date,hours:7.25,locations:{},note:""};$("#report-date").value=item.date;$("#work-hours").value=item.hours;$("#note").value=item.note||"";document.querySelectorAll(".location-input").forEach(i=>i.value=item.locations?.[i.dataset.location]||0);$("#entry-date-badge").textContent=dateText(item.date);updateTotal();}
function updateTotal(){const hours=Number($("#work-hours").value)||0,total=[...document.querySelectorAll(".location-input")].reduce((s,i)=>s+(Number(i.value)||0),0),rate=hours?total/hours:0,level=[...BONUS].reverse().find(b=>rate>=b.rate)?.value;$("#form-total").textContent=number(total);$("#form-evaluation").textContent=`${number(rate)} Stück/h · ${level?`Bonus ${String(level).replace(".",",")} erreicht`:`noch ${number(Math.max(0,750*hours-total))} bis Stufe 1,2`}`;}
async function fetchCloud(){if(!cloud)return;const {data,error}=await cloud.from("dmi_daily_reports").select("*");if(!error&&data){data.forEach(row=>{const incoming={date:row.report_date,hours:Number(row.hours),locations:row.locations||{},note:row.note||""};const index=state.entries.findIndex(e=>e.date===incoming.date);if(index<0)state.entries.push(incoming);else state.entries[index]=incoming;});saveLocal();render();}}
async function connectCloud(){const url=localStorage.getItem("dmi-supabase-url"),key=localStorage.getItem("dmi-supabase-key");if(!url||!key||!window.supabase)return;cloud=window.supabase.createClient(url,key);$("#sync-state").textContent="Cloud verbunden";await fetchCloud();cloud.channel("dmi-reports").on("postgres_changes",{event:"*",schema:"public",table:"dmi_daily_reports"},fetchCloud).subscribe();}
async function pushCloud(entry){if(!cloud)return; const {error}=await cloud.from("dmi_daily_reports").upsert({report_date:entry.date,hours:Number(entry.hours),locations:entry.locations,note:entry.note||"",updated_at:new Date().toISOString()});if(error)$("#sync-state").textContent="Synchronisation prüfen";}

document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.go)));$("#new-entry").onclick=()=>setView("entry");$("#cancel-entry").onclick=()=>setView("dashboard");$("#mobile-menu").onclick=()=>$(".sidebar").classList.toggle("open");
$("#entry-form").addEventListener("submit",e=>{e.preventDefault();const locations={};document.querySelectorAll(".location-input").forEach(i=>locations[i.dataset.location]=Number(i.value)||0);upsert({date:$("#report-date").value,hours:Number($("#work-hours").value),locations,note:$("#note").value.trim()});setView("dashboard");});$("#report-date").onchange=e=>{$("#entry-date-badge").textContent=dateText(e.target.value)};document.querySelectorAll(".location-input,#work-hours").forEach(i=>i.addEventListener("input",updateTotal));
$("#history-body").addEventListener("click",e=>{if(e.target.dataset.delete&&confirm("Eintrag wirklich löschen?"))removeEntry(e.target.dataset.delete)});$("#export-csv").onclick=()=>{const lines=["Datum;Arbeitszeit;Gesamt;Stück/h;Bonus",...entries().map(e=>`${e.date};${e.hours};${e.total};${e.rate.toFixed(1)};${e.bonus}`)];const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/csv"}));a.download="DMI-Tagesbericht.csv";a.click();};
$("#settings-button").onclick=()=>{$("#supabase-url").value=localStorage.getItem("dmi-supabase-url")||"";$("#supabase-key").value=localStorage.getItem("dmi-supabase-key")||"";$("#settings-dialog").showModal();};$("#save-settings").onclick=()=>{localStorage.setItem("dmi-supabase-url",$("#supabase-url").value.trim());localStorage.setItem("dmi-supabase-key",$("#supabase-key").value.trim());connectCloud();};$("#disconnect").onclick=()=>{localStorage.removeItem("dmi-supabase-url");localStorage.removeItem("dmi-supabase-key");cloud=null;$("#sync-state").textContent="Lokal gespeichert";$("#settings-dialog").close();};
$("#today-label").textContent=dateText(today);$("#report-date").value=today;render();connectCloud();if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js");
