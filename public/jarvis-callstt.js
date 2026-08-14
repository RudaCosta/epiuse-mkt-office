// ─────────────────────────────────────────────────────────────────────────────
// JARVIS · Captura do áudio da call + STT no navegador (FREE · tempo real)
// ─────────────────────────────────────────────────────────────────────────────
// Captura a voz do CLIENTE (que sai no fone do SDR) por 2 caminhos:
//
//   A) DISPOSITIVO  — getUserMedia num device de entrada que carrega o áudio de
//      saída: "Mixagem estéreo/Stereo Mix" (Windows) ou cabo virtual (VB-Cable).
//      ✅ Recomendado pra SOFTPHONE (3CX desktop): não depende de screen-share,
//         não morre se a janela mudar, e não captura notificação do sistema.
//
//   B) ÁUDIO DO SISTEMA — getDisplayMedia; no Windows o SDR escolhe "Tela inteira"
//      e marca "Compartilhar áudio do sistema". Pega o 3CX junto.
//      ⚠️ macOS não expõe áudio do sistema ao Chrome (limitação do SO).
//
// Transcrição: Whisper via transformers.js NO NAVEGADOR (custo zero por minuto).
// Auto-detecta hardware: WebGPU -> whisper-base; senão -> tiny no WASM.
//
// Opt-in e isolado: qualquer falha vira mensagem clara, nunca quebra o JARVIS.
// Expõe window.JarvisCallSTT.
(function () {
  'use strict';
  // @3 = última 3.x estável (jsdelivr resolve sempre; evita 404 de pin exato).
  var CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';

  var S = {
    on: false, stream: null, videoTrack: null, actx: null, node: null, src: null, sink: null,
    asr: null, engine: null, loading: false, busy: false,
    buf: [], sr: 16000, chunkSec: 4, minRms: 0.006,
    onText: null, onStatus: null, onLevel: null, lastLvl: 0, heard: false, actxRate: 0
  };

  function status(msg, kind) { if (S.onStatus) { try { S.onStatus(msg, kind || 'info'); } catch (e) {} } }
  function rms(f32) { var s = 0; for (var i = 0; i < f32.length; i++) s += f32[i] * f32[i]; return Math.sqrt(s / (f32.length || 1)); }

  // ⚠️ O Whisper EXIGE 16 kHz. Pedir sampleRate:16000 no AudioContext NÃO garante
  // nada — com fonte de aba/tela o Chrome costuma rodar a 48 kHz assim mesmo.
  // Mandar 48 kHz como se fosse 16 kHz "estica" o áudio 3x -> vira ruído e o
  // modelo entra em loop de repetição ("NNNNNN..."). Então reamostramos de fato.
  // Decimação com MÉDIA na janela = filtro passa-baixa cru (evita aliasing).
  function resampleTo16k(input, inRate) {
    if (!inRate || inRate === 16000) return input;
    var ratio = inRate / 16000;
    var outLen = Math.floor(input.length / ratio);
    var out = new Float32Array(outLen);
    for (var i = 0; i < outLen; i++) {
      var start = Math.floor(i * ratio), end = Math.min(Math.floor((i + 1) * ratio), input.length);
      if (end <= start) { out[i] = input[Math.min(start, input.length - 1)] || 0; continue; }
      var s = 0;
      for (var j = start; j < end; j++) s += input[j];
      out[i] = s / (end - start);
    }
    return out;
  }

  // Áudio de aba costuma vir baixo; normaliza pra faixa que o Whisper gosta.
  function normalize(f32) {
    var peak = 0;
    for (var i = 0; i < f32.length; i++) { var a = Math.abs(f32[i]); if (a > peak) peak = a; }
    if (peak < 0.001 || peak > 0.95) return f32;      // mudo ou já alto: não mexe
    var g = Math.min(8, 0.85 / peak);
    var out = new Float32Array(f32.length);
    for (var k = 0; k < f32.length; k++) out[k] = f32[k] * g;
    return out;
  }

  // ── modelo (1x, com auto-detecção de hardware) ─────────────────────────────
  async function ensureModel() {
    if (S.asr) return S.asr;
    if (S.loading) return null;
    S.loading = true;
    try {
      var mod = await import(/* @vite-ignore */ CDN);
      var pipeline = mod.pipeline, env = mod.env;
      if (env) { env.allowLocalModels = false; }
      var hasGPU = !!(navigator.gpu);
      var device = hasGPU ? 'webgpu' : 'wasm';
      var model = hasGPU ? 'onnx-community/whisper-base' : 'Xenova/whisper-tiny';
      S.engine = hasGPU ? 'Whisper base · WebGPU' : 'Whisper tiny · WASM (modo leve)';
      status('Carregando ' + S.engine + '… (1x, fica em cache)', 'load');
      S.asr = await pipeline('automatic-speech-recognition', model, {
        device: device, dtype: hasGPU ? 'fp16' : 'q8'
      });
      status(S.engine + ' pronto — ouvindo a call', 'ok');
      return S.asr;
    } catch (e) {
      status('Falha ao carregar o modelo de transcrição: ' + (e && e.message || e), 'err');
      S.asr = null;
      return null;
    } finally { S.loading = false; }
  }

  // Corta repetição degenerada ("NNNN", "ha ha ha ha") — sinal de áudio ruim.
  function ehRepeticao(t) {
    var s = String(t || '').trim();
    if (!s) return true;
    if (/^(.)\1{4,}$/i.test(s.replace(/\s/g, ''))) return true;          // "NNNNN"
    var w = s.toLowerCase().split(/\s+/);
    if (w.length >= 6) {
      var uniq = new Set(w);
      if (uniq.size <= Math.max(1, Math.floor(w.length * 0.25))) return true; // 75%+ repetido
    }
    return false;
  }

  async function processBuffer() {
    if (S.busy || !S.buf.length) return;
    var total = 0, i;
    for (i = 0; i < S.buf.length; i++) total += S.buf[i].length;
    // usa a taxa REAL do contexto (não a que pedimos) pra medir o tempo certo
    var rate = S.actxRate || S.sr;
    if (total < rate * S.chunkSec) return;
    var chunk = new Float32Array(total), o = 0;
    for (i = 0; i < S.buf.length; i++) { chunk.set(S.buf[i], o); o += S.buf[i].length; }
    S.buf = [];
    if (rms(chunk) < S.minRms) return; // silêncio: pula (economiza CPU/GPU)
    var pcm = normalize(resampleTo16k(chunk, rate));  // -> 16 kHz, que é o que o Whisper espera
    var asr = await ensureModel();
    if (!asr) return;
    S.busy = true;
    try {
      var out = await asr(pcm, {
        language: 'portuguese', task: 'transcribe',
        chunk_length_s: 30,               // janela nativa do Whisper
        temperature: 0,
        no_repeat_ngram_size: 3,          // trava o loop de repetição
        condition_on_previous_text: false // não arrasta alucinação do chunk anterior
      });
      var txt = (out && out.text || '').trim();
      if (txt && !ehRepeticao(txt) && S.onText) S.onText(txt);
    } catch (e) {
      status('Erro na transcrição: ' + (e && e.message || e), 'err');
    } finally { S.busy = false; }
  }

  // ── pipeline de áudio (comum aos 2 caminhos) ───────────────────────────────
  function attachStream(stream) {
    var atrk = stream.getAudioTracks();
    if (!atrk.length) return false;
    var AC = window.AudioContext || window.webkitAudioContext;
    // pedimos 16k, mas o navegador pode ignorar (fonte de aba costuma forçar 48k).
    // Guardamos a taxa REAL e reamostramos depois — sem isso o áudio ia "esticado".
    try { S.actx = new AC({ sampleRate: S.sr }); } catch (e) { S.actx = new AC(); }
    S.actxRate = S.actx.sampleRate || S.sr;
    if (S.actxRate !== S.sr) console.log('[jarvis-stt] contexto a', S.actxRate, 'Hz -> reamostrando pra 16000');
    S.src = S.actx.createMediaStreamSource(new MediaStream([atrk[0]]));
    var node = S.actx.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = function (ev) {
      if (!S.on) return;
      var data = new Float32Array(ev.inputBuffer.getChannelData(0));
      // medidor de sinal (~10fps): deixa o SDR VER se está entrando áudio.
      // Sem isto, "não funciona" era indistinguível de "fonte errada".
      var now = Date.now();
      if (S.onLevel && now - S.lastLvl > 100) {
        S.lastLvl = now;
        var lvl = rms(data);
        if (lvl > 0.01) S.heard = true;
        try { S.onLevel(lvl, S.heard); } catch (e) {}
      }
      S.buf.push(data);
      processBuffer();
    };
    // sink com ganho 0: ScriptProcessor precisa de destino, mas NÃO tocamos o
    // áudio de volta (evitaria eco/microfonia no fone do SDR).
    S.sink = S.actx.createGain(); S.sink.gain.value = 0;
    S.src.connect(node); node.connect(S.sink); S.sink.connect(S.actx.destination);
    S.node = node;
    S.stream = stream;
    atrk[0].addEventListener('ended', function () { stop(); });
    return true;
  }

  // ── A) captura por DISPOSITIVO (Stereo Mix / cabo virtual) — recomendado ───
  async function startDevice(deviceId, onText, onStatus, onLevel) {
    S.onText = onText || S.onText; S.onStatus = onStatus || S.onStatus; S.onLevel = onLevel || S.onLevel; S.heard = false;
    if (S.on) return true;
    try {
      // desliga o processamento de voz: cancelamento de eco/ruído DESTRÓI áudio
      // de loopback (o Chrome acha que é eco do alto-falante e corta).
      var stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false, noiseSuppression: false, autoGainControl: false
        }
      });
      if (!attachStream(stream)) {
        status('O dispositivo escolhido não entregou áudio.', 'err');
        try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        return false;
      }
      S.on = true;
      status('Ouvindo o dispositivo de áudio da call', 'ok');
      ensureModel();
      return true;
    } catch (e) {
      var m = (e && e.name === 'NotAllowedError')
        ? 'Permissão negada pro dispositivo de áudio.'
        : 'Não consegui abrir o dispositivo: ' + (e && e.message || e);
      status(m, 'err');
      return false;
    }
  }

  // ── B) captura do ÁUDIO DO SISTEMA (getDisplayMedia) ───────────────────────
  async function startDisplay(onText, onStatus, onLevel) {
    S.onText = onText || S.onText; S.onStatus = onStatus || S.onStatus; S.onLevel = onLevel || S.onLevel; S.heard = false;
    if (S.on) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      status('Navegador sem getDisplayMedia — use o Chrome.', 'err');
      return false;
    }
    var stream;
    try {
      // vídeo mínimo (a API exige vídeo pra liberar o áudio do sistema).
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1, width: 320, height: 180 },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
    } catch (e) {
      status('Compartilhamento cancelado.', 'warn');
      return false;
    }
    if (!stream.getAudioTracks().length) {
      status('Sem faixa de áudio. Ao escolher a aba do 3CX, MARQUE "Compartilhar áudio da aba".', 'err');
      try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      return false;
    }
    // ⚠️ NÃO parar a faixa de vídeo: em várias versões do Chrome isso encerra a
    // sessão inteira e derruba o áudio junto. Guardamos e paramos só no stop().
    S.videoTrack = stream.getVideoTracks()[0] || null;
    if (S.videoTrack) S.videoTrack.addEventListener('ended', function () { stop(); });
    if (!attachStream(stream)) { status('Falha ao ligar o áudio capturado.', 'err'); stop(); return false; }
    S.on = true;
    status('Capturando o áudio da aba/tela', 'ok');
    ensureModel();
    return true;
  }

  // ── lista dispositivos de entrada (pra escolher o do softphone) ────────────
  async function listDevices() {
    try {
      // sem permissão de mic os rótulos vêm vazios — pede uma vez.
      try { (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      var ds = await navigator.mediaDevices.enumerateDevices();
      return ds.filter(function (d) { return d.kind === 'audioinput'; })
               .map(function (d, i) { return { id: d.deviceId, label: d.label || ('Entrada de áudio ' + (i + 1)) }; });
    } catch (e) { return []; }
  }

  // sugere o device mais provável de carregar o áudio de saída
  function guessLoopback(devices) {
    var re = /(mixagem est|stereo mix|what ?u hear|loopback|vb-?audio|vb-?cable|cable output|voicemeeter|virtual)/i;
    return (devices || []).filter(function (d) { return re.test(d.label); })[0] || null;
  }

  function stop() {
    S.on = false;
    try { S.node && S.node.disconnect(); } catch (e) {}
    try { S.sink && S.sink.disconnect(); } catch (e) {}
    try { S.src && S.src.disconnect(); } catch (e) {}
    try { S.actx && S.actx.close(); } catch (e) {}
    try { S.videoTrack && S.videoTrack.stop(); } catch (e) {}
    try { S.stream && S.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    S.node = S.sink = S.src = S.actx = S.stream = S.videoTrack = null; S.buf = []; S.actxRate = 0;
    status('Captura da call parada.', 'info');
  }

  window.JarvisCallSTT = {
    startDevice: startDevice,
    startDisplay: startDisplay,
    listDevices: listDevices,
    guessLoopback: guessLoopback,
    stop: stop,
    isOn: function () { return S.on; },
    engine: function () { return S.engine; },
    heardAudio: function () { return S.heard; },
    sampleRate: function () { return S.actxRate; },
    supported: function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia); }
  };
})();
