    requestAnimationFrame(() => document.body.classList.add("ready"));
    const $ = id => document.getElementById(id);
    const screens = { welcome: $("welcome"), game: $("game"), result: $("result") };
    const missions = [
      { goal: 5, label: "Aquecimento", text: "acerte 5 pompons" },
      { goal: 10, label: "Dedos ligeiros", text: "acerte 10 pompons" },
      { goal: 15, label: "Mestre do toque", text: "acerte 15 pompons" }
    ];
    const faces = ["🐰","🐱","🐹","🐻","🐼","🐸"];
    let score = 0, hits = 0, combo = 1, lives = 3, active = false, deadline = 0, frame = 0, missionIndex = 0, roundStarted = 0, roundTime = 1500;
    let playerName = localStorage.getItem("pegaPompomName") || "", soundOn = true;
    let best = Number(localStorage.getItem("pegaPompomBest") || 0);
    $("welcomeBest").textContent = best;
    $("playerName").value = playerName;

    let audioCtx, musicTimer, musicStep = 0;
    function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === "suspended") audioCtx.resume(); }
    function tone(freq, duration=.09, type="sine", volume=.055, delay=0) {
      if (!soundOn) return; initAudio(); const now=audioCtx.currentTime+delay, osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
      osc.type=type; osc.frequency.setValueAtTime(freq,now); gain.gain.setValueAtTime(.0001,now); gain.gain.exponentialRampToValueAtTime(volume,now+.012); gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      osc.connect(gain).connect(audioCtx.destination); osc.start(now); osc.stop(now+duration+.02);
    }
    function soundHit(perfect) { tone(perfect?740:540,.08,"sine",.07); tone(perfect?1110:810,.12,"sine",.045,.055); }
    function soundMiss() { tone(180,.16,"triangle",.045); tone(130,.2,"triangle",.035,.1); }
    function soundMission() { [523,659,784,1047].forEach((n,i)=>tone(n,.16,"sine",.04,i*.07)); }
    function startLofi() {
      if (!soundOn || musicTimer) return; initAudio();
      const chords=[[220,261.6,329.6],[196,246.9,293.7],[174.6,220,261.6],[196,246.9,329.6]];
      const play=()=>{ const chord=chords[musicStep++%chords.length]; chord.forEach((n,i)=>tone(n,.75,"sine",.012,i*.025)); tone(chord[0]/2,.22,"triangle",.018); };
      play(); musicTimer=setInterval(play,900);
    }
    function stopLofi() { clearInterval(musicTimer); musicTimer=null; }

    function show(name) { Object.entries(screens).forEach(([key,el]) => el.classList.toggle("hidden", key !== name)); }
    function startGame() {
      const input=$("playerName"); playerName=input.value.trim().replace(/[<>]/g,"").slice(0,18);
      if (!playerName) { input.setCustomValidity("Escolha um nome fofinho para entrar no ranking!"); input.reportValidity(); input.focus(); return; }
      input.setCustomValidity(""); localStorage.setItem("pegaPompomName",playerName); initAudio(); startLofi();
      score = 0; hits = 0; combo = 1; lives = 3; missionIndex = 0; active = true;
      show("game"); updateHud(); updateMission(); moveTarget(); startTimer();
    }
    function updateHud() {
      $("score").textContent = score;
      $("combo").textContent = `x${combo}`;
      $("lives").textContent = Array(lives).fill("♥").join(" ") + Array(3-lives).fill("♡").join(" ");
    }
    function updateMission() {
      const m = missions[Math.min(missionIndex,missions.length-1)];
      $("missionText").textContent = missionIndex >= missions.length ? "todas completas!" : m.text;
      $("missionProgress").textContent = missionIndex >= missions.length ? "✓" : `${Math.min(hits,m.goal)}/${m.goal}`;
    }
    function moveTarget() {
      const field = $("playfield"), target = $("target");
      const size = target.offsetWidth || 86;
      const maxX = Math.max(0, field.clientWidth - size);
      const maxY = Math.max(0, field.clientHeight - size);
      target.style.left = `${Math.random()*maxX}px`;
      target.style.top = `${Math.random()*maxY}px`;
      target.querySelector("span").textContent = faces[Math.floor(Math.random()*faces.length)];
      roundTime = Math.max(760,1500-hits*25);
      const level = hits<6 ? [1,"Calminho"] : hits<13 ? [2,"Ligeiro"] : hits<20 ? [3,"Frenético"] : [4,"Impossível"];
      $("levelBadge").textContent=`Nível ${level[0]} · ${level[1]}`;
    }
    function startTimer() {
      cancelAnimationFrame(frame); roundStarted=performance.now(); deadline = roundStarted + roundTime;
      function tick(now) {
        if (!active) return;
        const left = Math.max(0,(deadline-now)/roundTime);
        $("timer").style.transform = `scaleX(${left})`;
        if (left <= 0) miss(); else frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }
    function hit(e) {
      if (!active) return;
      const response=performance.now()-roundStarted, perfect=response<430; const gained=(10 * combo)+(perfect?5:0); score += gained; hits++; combo = Math.min(5,combo+1); soundHit(perfect);
      const pop = document.createElement("span"); pop.className = "pop-score"; pop.textContent = `+${gained}`;
      pop.style.left = `${e.clientX - $("playfield").getBoundingClientRect().left - 15}px`;
      pop.style.top = `${e.clientY - $("playfield").getBoundingClientRect().top - 10}px`;
      $("playfield").appendChild(pop); setTimeout(() => pop.remove(),700);
      if (perfect || combo===5) { const s=$("streak"); s.textContent=perfect?"PERFEITO! ✦":"COMBO MÁXIMO! 🔥"; s.classList.remove("show"); void s.offsetWidth; s.classList.add("show"); }
      if (missionIndex < missions.length && hits >= missions[missionIndex].goal) { missionIndex++; showToast(); }
      updateHud(); updateMission(); moveTarget(); startTimer();
      if (navigator.vibrate) navigator.vibrate(18);
    }
    function miss() {
      lives--; combo = 1; soundMiss(); updateHud();
      if (navigator.vibrate) navigator.vibrate([50,40,50]);
      if (lives <= 0) endGame(); else { moveTarget(); startTimer(); }
    }
    function showToast() { soundMission(); const t=$("toast"); t.classList.remove("show"); void t.offsetWidth; t.classList.add("show"); }
    function endGame() {
      active = false; cancelAnimationFrame(frame);
      if (score > best) { best = score; localStorage.setItem("pegaPompomBest",best); }
      $("finalScore").textContent = score; $("finalHits").textContent = hits; $("finalBest").textContent = best;
      $("welcomeBest").textContent = best;
      const rank = hits >= 15 ? ["Lendário!","Seus dedos são mais rápidos que a luz.","🏆"] : hits >= 8 ? ["Mandou bem!","O pompom suou para fugir de você.","🌟"] : ["Quase lá!","O pompom venceu essa, mas quer revanche!","💗"];
      $("resultTitle").textContent=rank[0]; $("resultMessage").textContent=rank[1]; $("resultIcon").textContent=rank[2];
      $("missionList").innerHTML = missions.map(m => `<li class="${hits>=m.goal?'done':''}">${hits>=m.goal?'✓':'○'} ${m.label}: ${m.text}</li>`).join("");
      saveScore({name:playerName,score,hits}); show("result");
    }
    function dedupeScores(rows) {
      const bestByName = new Map();
      rows.forEach(row => { const name=String(row.name||"").trim(), key=name.toLocaleLowerCase("pt-BR"), current=bestByName.get(key); if(name && (!current || Number(row.score)>Number(current.score))) bestByName.set(key,{name,score:Number(row.score)||0,hits:Number(row.hits)||0}); });
      return [...bestByName.values()].sort((a,b)=>b.score-a.score);
    }
    function localScores() { try { return dedupeScores(JSON.parse(localStorage.getItem("pegaPompomRanking")||"[]")); } catch { return []; } }
    async function saveScore(entry) {
      const local=dedupeScores([...localScores(),entry]); localStorage.setItem("pegaPompomRanking",JSON.stringify(local.slice(0,30)));
      try { const res=await fetch("/api/scores",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(entry)}); if(!res.ok) throw Error(); } catch(e) { console.warn("Ranking global indisponível; pontuação salva localmente."); }
    }
    async function loadRanking() {
      $("ranking").innerHTML=""; $("rankStatus").textContent="Carregando estrelinhas…"; let data=[];
      try { const res=await fetch("/api/scores",{headers:{Accept:"application/json"}}); if(!res.ok) throw Error(); data=dedupeScores(await res.json()).slice(0,10); $("rankStatus").textContent="Ranking global · melhores pontuações"; }
      catch { data=localScores().slice(0,10); $("rankStatus").textContent="Sem conexão · mostrando ranking deste aparelho"; }
      if(!data.length) $("rankStatus").textContent="Ninguém pontuou ainda. Seja a primeira estrela!";
      $("ranking").innerHTML=data.map((p,i)=>`<li class="${p.name.toLocaleLowerCase("pt-BR")===playerName.toLocaleLowerCase("pt-BR")?'me':''}"><span class="rank-num">${i<3?["🥇","🥈","🥉"][i]:i+1}</span><span class="rank-name">${escapeHtml(p.name)}</span><span class="rank-score">${Number(p.score)||0}</span></li>`).join("");
    }
    function escapeHtml(v) { const d=document.createElement("div"); d.textContent=String(v); return d.innerHTML; }
    function openRanking(){ $("rankingModal").classList.remove("hidden"); $("closeRanking").focus(); loadRanking(); }
    function closeRanking(){ $("rankingModal").classList.add("hidden"); $("rankingBtn").focus(); }
    $("playBtn").addEventListener("click",startGame);
    $("againBtn").addEventListener("click",startGame);
    $("homeBtn").addEventListener("click",()=>show("welcome"));
    $("rankingBtn").addEventListener("click",openRanking);
    $("closeRanking").addEventListener("click",closeRanking);
    $("rankingModal").addEventListener("click",e=>{if(e.target===$("rankingModal")) closeRanking()});
    $("soundBtn").addEventListener("click",()=>{ soundOn=!soundOn; $("soundBtn").innerHTML=`<span class="sound-dot"></span>${soundOn?"Som ligado":"Som desligado"}`; $("soundBtn").classList.toggle("is-on",soundOn); $("soundBtn").setAttribute("aria-pressed",String(soundOn)); if(soundOn){initAudio();startLofi()}else stopLofi(); });
    $("playerName").addEventListener("keydown",e=>{if(e.key==="Enter") startGame()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("rankingModal").classList.contains("hidden")) closeRanking()});
    $("target").addEventListener("pointerdown",hit);
    window.addEventListener("resize",()=>{ if(active) moveTarget(); });
