const DB_NAME="shinyHunterDB", STORE="state";
let db, state={pokemon:"ファイヤー",game:"リーフグリーン",odds:8192,count:0,seconds:0,running:false,startedAt:null,history:[],memo:""};
let timerInterval=null;
const $=id=>document.getElementById(id);
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function readState(){return new Promise(resolve=>{const tx=db.transaction(STORE,"readonly"),req=tx.objectStore(STORE).get("main");req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>resolve(null)})}
function writeState(){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(state,"main");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
function fmtTime(s){s=Math.max(0,Math.floor(s));const h=String(Math.floor(s/3600)).padStart(2,"0"),m=String(Math.floor(s%3600/60)).padStart(2,"0"),sec=String(s%60).padStart(2,"0");return `${h}:${m}:${sec}`}
function elapsed(){return state.seconds+(state.running&&state.startedAt?Math.floor((Date.now()-state.startedAt)/1000):0)}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800)}
async function persist(){try{await writeState()}catch(e){toast("保存に失敗しました")}}
function render(){
 $("currentPokemon").textContent=state.pokemon;$("currentGame").textContent=state.game;$("count").textContent=state.count.toLocaleString("ja-JP");
 $("timer").textContent=fmtTime(elapsed());$("timerBtn").textContent=state.running?"Ⅱ 一時停止":"▶ 開始";
 $("totalTries").textContent=(state.history.filter(h=>h.result!=="途中経過").reduce((n,h)=>n+h.count,0)+state.count).toLocaleString("ja-JP");
 $("completedHunts").textContent=state.history.filter(h=>h.result==="色違い達成").length;
 $("oddsLabel").textContent="1 / "+Number(state.odds).toLocaleString("ja-JP");
 const p=1-Math.pow(1-1/Math.max(1,state.odds),state.count);$("probability").textContent=(p*100).toFixed(2)+"%";
 const list=$("historyList");list.innerHTML="";
 if(!state.history.length){list.innerHTML='<p class="empty">まだ履歴はありません。カウントを保存してみよう！</p>'}
 else state.history.slice(0,5).forEach(h=>{const el=document.createElement("div");el.className="history-item";const left=document.createElement("div"),right=document.createElement("div");const strong=document.createElement("strong"),small=document.createElement("small"),tag=document.createElement("span");strong.textContent=h.pokemon+" ・ "+h.game;small.textContent=new Date(h.date).toLocaleString("ja-JP");tag.className="tag"+(h.result==="途中経過"?" progress":"");tag.textContent=h.result;left.append(strong,small,document.createElement("br"),tag);right.className="history-count";right.textContent=h.count.toLocaleString("ja-JP")+" 回";
 if(h.result==="途中経過"){const load=document.createElement("button");load.className="small-btn";load.textContent="呼び出して再開";load.onclick=()=>loadProgress(h);right.append(document.createElement("br"),load)}
 el.append(left,right);list.append(el)});
}
async function saveEntry(result,extra=""){if(state.count<1){toast("まず回数をカウントしてね");return}state.history.unshift({id:Date.now().toString(),pokemon:state.pokemon,game:state.game,odds:state.odds,count:state.count,seconds:elapsed(),result,memo:extra||state.memo,date:new Date().toISOString()});state.count=0;state.seconds=0;state.running=false;state.startedAt=null;await persist();render();toast(result+"を保存しました")}
async function saveProgress(){
 if(state.count<1 && elapsed()<1){toast("回数または計測時間がありません");return}
 state.history.unshift({id:Date.now().toString(),pokemon:state.pokemon,game:state.game,odds:state.odds,count:state.count,seconds:elapsed(),result:"途中経過",memo:state.memo,date:new Date().toISOString()});
 await persist();render();toast("途中経過を保存しました。現在の計測は継続します")
}
async function loadProgress(h){
 if(!confirm(`${h.pokemon}（${h.game}）の途中経過を呼び出します。現在の進行中データは置き換わります。よろしいですか？`))return;
 state.pokemon=h.pokemon;state.game=h.game;state.odds=h.odds||state.odds;state.count=h.count;state.seconds=h.seconds||0;state.running=false;state.startedAt=null;state.memo=h.memo||"";
 await persist();render();toast("途中経過を呼び出しました。開始ボタンで再開できます")
}
$("plusOne").onclick=async()=>{state.count++;await persist();render()};
$("minusOne").onclick=async()=>{state.count=Math.max(0,state.count-1);await persist();render()};
$("plusTen").onclick=async()=>{state.count+=10;await persist();render()};
$("plusHundred").onclick=async()=>{state.count+=100;await persist();render()};
$("editCountBtn").onclick=()=>{$("countInput").value=state.count;$("countDialog").showModal()};
$("countForm").onsubmit=async e=>{e.preventDefault();const raw=$("countInput").value;const value=Number(raw);if(raw===""||!Number.isSafeInteger(value)||value<0){toast("0以上の整数を入力してください");return}state.count=value;await persist();$("countDialog").close();render();toast("回数を変更しました")};
$("timerBtn").onclick=async()=>{if(state.running){state.seconds=elapsed();state.running=false;state.startedAt=null}else{state.running=true;state.startedAt=Date.now()}await persist();render()};
$("saveProgress").onclick=saveProgress;
$("shinyFound").onclick=()=>{if(!state.count){toast("まず回数をカウントしてね");return}$("resultSummary").textContent=`${state.pokemon}：${state.count.toLocaleString("ja-JP")} 回で達成！`;$("resultDialog").showModal()};
$("confirmShiny").onclick=async e=>{e.preventDefault();const memo=$("resultMemo").value; $("resultDialog").close();$("resultMemo").value="";await saveEntry("色違い達成",memo)};
$("editHuntBtn").onclick=()=>{$("pokemonInput").value=state.pokemon;$("gameInput").value=state.game;$("oddsInput").value=state.odds;$("memoInput").value=state.memo;$("huntDialog").showModal()};
$("huntForm").onsubmit=async e=>{e.preventDefault();state.pokemon=$("pokemonInput").value.trim()||"未設定";state.game=$("gameInput").value.trim()||"未設定";state.odds=Math.max(1,Number($("oddsInput").value)||8192);state.memo=$("memoInput").value;await persist();$("huntDialog").close();render();toast("厳選対象を更新しました")};
$("settingsBtn").onclick=()=>$("settingsDialog").showModal();
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),state},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="shiny-hunter-backup.json";a.click();URL.revokeObjectURL(url);toast("バックアップを書き出しました")};
$("importFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.state||!Array.isArray(data.state.history))throw Error();state={...state,...data.state,running:false,startedAt:null};await persist();render();toast("バックアップを読み込みました")}catch(err){toast("ファイルを読み込めませんでした")}e.target.value=""};
$("resetBtn").onclick=async()=>{if(confirm("すべての厳選記録を削除します。この操作は取り消せません。")){state={pokemon:"ファイヤー",game:"リーフグリーン",odds:8192,count:0,seconds:0,running:false,startedAt:null,history:[],memo:""};await persist();render();toast("データを削除しました")}};
$("allHistoryBtn").onclick=()=>{if(!state.history.length){toast("履歴はまだありません");return}const lines=state.history.map(h=>`${new Date(h.date).toLocaleString("ja-JP")}｜${h.pokemon}｜${h.game}｜${h.count}回｜${h.result}`).join("\n");alert(lines)};
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");if(b.dataset.tab==="history")$("historyList").scrollIntoView({behavior:"smooth"});else if(b.dataset.tab==="stats")$("probability").scrollIntoView({behavior:"smooth"});else window.scrollTo({top:0,behavior:"smooth"})});
(async()=>{try{db=await openDB();const saved=await readState();if(saved)state={...state,...saved};if(state.running&&state.startedAt){/* timer continues across reload */}render();timerInterval=setInterval(()=>{if(state.running){$("timer").textContent=fmtTime(elapsed())}},250);document.addEventListener("visibilitychange",()=>{if(!document.hidden)render()})}catch(e){toast("このブラウザでは保存機能を利用できません")}})();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));