const http = require('http');
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const SYSTEM = 'انت مساعد ذكي ودود بتتكلم بالعامية المصرية بشكل بسيط وواضح. بتساعد المستخدم في أي سؤال: شغل، هندسة، كتابة، أفكار، حياة يومية. جاوب باختصار ومباشرة، ومن غير مقدمات طويلة. لو المستخدم كتب بلغة تانية رد بلغته.';
const PAGE = String.raw`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0f172a">
<title>مساعد نصر الذكي</title>
<style>
*{box-sizing:border-box;margin:0}
html,body{height:100%}
body{font-family:"Segoe UI",Tahoma,"Noto Sans Arabic",system-ui,sans-serif;background:radial-gradient(1200px 600px at 80% -10%,#1e3a8a55,transparent),#0f172a;color:#e5e7eb}
.app{max-width:760px;height:100dvh;margin:auto;display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #ffffff14;background:#0f172acc}
.logo{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;font-size:22px;background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff}
h1{font-size:18px}header p{font-size:12px;color:#94a3b8}
#clear{margin-inline-start:auto;background:#ffffff12;border:0;color:#e5e7eb;width:38px;height:38px;border-radius:12px;font-size:20px;cursor:pointer}
main{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.empty{margin:auto;text-align:center;max-width:420px}
.big{font-size:44px;background:linear-gradient(135deg,#818cf8,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
.empty h2{margin:8px 0}.empty p{color:#94a3b8;line-height:1.8}
.chips{display:flex;flex-direction:column;gap:8px;margin-top:16px}
.chips button{background:#ffffff0d;border:1px solid #ffffff1a;color:#e5e7eb;padding:11px 14px;border-radius:14px;font:inherit;cursor:pointer}
.msg{max-width:85%;padding:11px 15px;border-radius:18px;line-height:1.85;white-space:pre-wrap;word-wrap:break-word;font-size:15.5px}
.user{align-self:flex-start;background:linear-gradient(135deg,#4f46e5,#0891b2);color:#fff}
.bot{align-self:flex-end;background:#1e293b;border:1px solid #ffffff12}
.err{align-self:center;background:#7f1d1d55;color:#fecaca;font-size:14px}
.dots span{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:#94a3b8;animation:b 1.2s infinite}
.dots span:nth-child(2){animation-delay:.2s}.dots span:nth-child(3){animation-delay:.4s}
@keyframes b{0%,80%,100%{opacity:.25}40%{opacity:1}}
.soon{margin:0 16px 8px;padding:10px 14px;border-radius:14px;background:#78350f55;color:#fde68a;text-align:center;font-size:14px}
form{display:flex;gap:10px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #ffffff14}
textarea{flex:1;resize:none;max-height:140px;background:#1e293b;border:1px solid #ffffff1a;color:#fff;border-radius:16px;padding:12px 14px;font:inherit;outline:none}
textarea:focus{border-color:#6366f1}
#send{width:48px;height:48px;border:0;border-radius:16px;background:linear-gradient(135deg,#6366f1,#06b6d4);color:#fff;font-size:20px;cursor:pointer;transform:scaleX(-1)}
#send:disabled,textarea:disabled{opacity:.45;cursor:not-allowed}

</style>
</head>
<body>
<div class="app">
  <header>
    <div class="logo">✦</div>
    <div><h1>مساعد نصر</h1><p>مساعدك الذكي الشخصي</p></div>
    <button id="clear" title="محادثة جديدة">＋</button>
  </header>
  <main id="log">
    <div class="empty" id="empty">
      <div class="big">✦</div>
      <h2>أهلاً يا هندسة 👋</h2>
      <p>أنا مساعدك الذكي. اسألني في أي حاجة: شغل، حصر، كتابة، أفكار، أي حاجة.</p>
      <div class="chips">
        <button>اكتبلي رسالة رسمية لمقاول</button>
        <button>اشرحلي طريقة حساب كمية الخرسانة</button>
        <button>اقترحلي فكرة مشروع صغير</button>
      </div>
    </div>
  </main>
  <div class="soon" id="soon" hidden>قريب… المساعد لسه بيتجهز وهيشتغل في أي لحظة ⏳</div>
  <form id="form">
    <textarea id="input" rows="1" placeholder="اكتب رسالتك هنا…"></textarea>
    <button id="send" type="submit" aria-label="إرسال">➤</button>
  </form>
</div>
<script>
const log=document.getElementById('log'),input=document.getElementById('input'),form=document.getElementById('form'),send=document.getElementById('send'),soon=document.getElementById('soon'),empty=document.getElementById('empty');
let history=JSON.parse(sessionStorage.getItem('h')||'[]'),busy=false,ready=false;
function add(cls,text){const d=document.createElement('div');d.className='msg '+cls;d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight;return d;}
function render(){history.forEach(m=>add(m.role==='user'?'user':'bot',m.text));if(history.length)empty.remove();}
function setReady(r){ready=r;soon.hidden=r;input.disabled=!r;send.disabled=!r;if(r)input.focus();}
async function status(){try{const j=await (await fetch('/api/status')).json();setReady(!!j.ready);}catch(e){setReady(false);}}
async function go(text){
  if(!text||busy||!ready)return;busy=true;empty.remove();
  history.push({role:'user',text});add('user',text);input.value='';input.style.height='auto';
  const t=add('bot','');t.innerHTML='<span class="dots"><span></span><span></span><span></span></span>';
  try{
    const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history})});
    const j=await r.json();t.remove();
    if(r.status===503){setReady(false);history.pop();}
    else if(!r.ok){add('err',j.error||'حصلت مشكلة، جرب تاني.');history.pop();}
    else{history.push({role:'model',text:j.text});add('bot',j.text);}
  }catch(e){t.remove();add('err','النت واقع، جرب تاني.');history.pop();}
  sessionStorage.setItem('h',JSON.stringify(history));busy=false;
}
form.addEventListener('submit',e=>{e.preventDefault();go(input.value.trim());});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&window.innerWidth>700){e.preventDefault();go(input.value.trim());}});
input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,140)+'px';});
document.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>go(b.textContent));
document.getElementById('clear').onclick=()=>{sessionStorage.removeItem('h');location.reload();};
render();status();

</script>
</body>
</html>
`;
const hits = new Map();
function limited(ip){const n=Date.now();const a=(hits.get(ip)||[]).filter(t=>n-t<60000);a.push(n);hits.set(ip,a);return a.length>20;}
function send(res,code,obj){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}
function key(){const k=(process.env.GEMINI_API_KEY||'').trim();return (!k||k==='PLACEHOLDER'||k.startsWith('REPLACE'))?'':k;}
function chat(req,res){
  let body='';req.on('data',c=>{body+=c;if(body.length>200000)req.destroy();});
  req.on('end',async()=>{
    if(!key())return send(res,503,{error:'soon'});
    if(limited(req.headers['x-forwarded-for']||req.socket.remoteAddress))return send(res,429,{error:'كتير أوي، استنى شوية وجرب تاني.'});
    let msgs;try{msgs=JSON.parse(body).messages;}catch(e){return send(res,400,{error:'bad'});}
    if(!Array.isArray(msgs)||!msgs.length)return send(res,400,{error:'bad'});
    const contents=msgs.slice(-30).map(m=>({role:m.role==='model'?'model':'user',parts:[{text:String(m.text||'').slice(0,8000)}]}));
    try{
      const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key()},body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents})});
      const j=await r.json();
      if(!r.ok){console.error('gemini',r.status,JSON.stringify(j).slice(0,300));return send(res,502,{error:r.status===429?'الخدمة مزدحمة دلوقتي، جرب بعد شوية.':'حصلت مشكلة، جرب تاني.'});}
      const text=(j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts||[]).map(p=>p.text||'').join('');
      send(res,200,{text:text||'مفيش رد المرة دي، جرب تاني.'});
    }catch(e){console.error(e);send(res,502,{error:'حصلت مشكلة في الاتصال، جرب تاني.'});}
  });
}
http.createServer((req,res)=>{
  const u=req.url.split('?')[0];
  if(u==='/api/status')return send(res,200,{ready:!!key()});
  if(u==='/api/chat'&&req.method==='POST')return chat(req,res);
  if(u==='/healthz'){res.writeHead(200);return res.end('ok');}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});
  res.end(PAGE);
}).listen(PORT,()=>console.log('up',PORT));
