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
    onText: null, onStatus: null
  };

  function status(msg, kind) { if (S.onStatus) { try { S.onStatus(msg, kind || 'info'); } catch (e) {} } }
  function rms(f32) { var s = 0; for (var i = 0; i < f32.length; i++) s += f32[i] * f32[i]; return Math.sqrt(s / (f32.length || 1)); }

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

  async function processBuffer() {
    if (S.busy || !S.buf.length) return;
    var total = 0, i;
    for (i = 0; i < S.buf.length; i++) total += S.buf[i].length;
    if (total < S.sr * S.chunkSec) return;
    var chunk = new Float32Array(total), o = 0;
    for (i = 0; i < S.buf.length; i++) { chunk.set(S.buf[i], o); o += S.buf[i].length; }
    S.buf = [];
    if (rms(chunk) < S.minRms) return; // silêncio: pula (economiza CPU/GPU)
    var asr = await ensureModel();
    if (!asr) return;
    S.busy = true;
    try {
      var out = await asr(chunk, { language: 'portuguese', task: 'transcribe', chunk_length_s: S.chunkSec + 2 });
      var txt = (out && out.text || '').trim();
      if (txt && !/^[\s.\-—]*$/.test(txt) && S.onText) S.onText(txt);
    } catch (e) {
      status('Erro na transcrição: ' + (e && e.message || e), 'err');
    } finally { S.busy = false; }
  }

  // ── pipeline de áudio (comum aos 2 caminhos) ───────────────────────────────
  function attachStream(stream) {
    var atrk = stream.getAudioTracks();
    if (!atrk.length) return false;
    var AC = window.AudioContext || window.webkitAudioContext;
    S.actx = new AC({ sampleRate: S.sr });
    S.src = S.actx.createMediaStreamSource(new MediaStream([atrk[0]]));
    var node = S.actx.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = function (ev) {
      if (!S.on) return;
      S.buf.push(new Float32Array(ev.inputBuffer.getChannelData(0)));
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
  async function startDevice(deviceId, onText, onStatus) {
    S.onText = onText || S.onText; S.onStatus = onStatus || S.onStatus;
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
  async function startDisplay(onText, onStatus) {
    S.onText = onText || S.onText; S.onStatus = onStatus || S.onStatus;
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
      status('Sem faixa de áudio. Escolha "Tela inteira" e MARQUE "Compartilhar áudio do sistema".', 'err');
      try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      return false;
    }
    // ⚠️ NÃO parar a faixa de vídeo: em várias versões do Chrome isso encerra a
    // sessão inteira e derruba o áudio junto. Guardamos e paramos só no stop().
    S.videoTrack = stream.getVideoTracks()[0] || null;
    if (S.videoTrack) S.videoTrack.addEventListener('ended', function () { stop(); });
    if (!attachStream(stream)) { status('Falha ao ligar o áudio capturado.', 'err'); stop(); return false; }
    S.on = true;
    status('Ouvindo o áudio do sistema', 'ok');
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
    S.node = S.sink = S.src = S.actx = S.stream = S.videoTrack = null; S.buf = [];
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
    supported: function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia); }
  };
})();
