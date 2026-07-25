// ─────────────────────────────────────────────────────────────────────────────
// JARVIS · Captura de áudio da call + STT no navegador (FREE · tempo real)
// ─────────────────────────────────────────────────────────────────────────────
// getDisplayMedia (áudio da aba/sistema = lado do CLIENTE) -> Whisper via
// transformers.js. Auto-detecta hardware: WebGPU -> whisper-base; senão -> tiny
// no WASM (modo leve). ZERO custo por minuto — roda na máquina do SDR.
//
// Opt-in e isolado: se faltar getDisplayMedia / faixa de áudio / modelo, degrada
// com mensagem clara e NÃO quebra o resto do JARVIS. Expõe window.JarvisCallSTT.
// ⚠️ BETA — precisa de teste em navegador real (WebGPU/áudio não rodam no CI).
(function () {
  'use strict';
  var CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1';

  var S = {
    on: false, stream: null, actx: null, node: null, src: null, sink: null,
    asr: null, engine: null, loading: false, busy: false,
    buf: [], sr: 16000, chunkSec: 4, minRms: 0.006,
    onText: null, onStatus: null
  };

  function status(msg, kind) { if (S.onStatus) { try { S.onStatus(msg, kind || 'info'); } catch (e) {} } }

  function rms(f32) { var s = 0; for (var i = 0; i < f32.length; i++) s += f32[i] * f32[i]; return Math.sqrt(s / (f32.length || 1)); }

  // carrega transformers.js + cria o pipeline (1x). Auto-detecta WebGPU.
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
      status(S.engine + ' pronto', 'ok');
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
    if (total < S.sr * S.chunkSec) return; // ainda não tem ~chunkSec de áudio
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
      // descarta ruídos comuns que o Whisper alucina em silêncio
      if (txt && !/^[\s.\-—]*$/.test(txt) && S.onText) S.onText(txt);
    } catch (e) {
      status('Erro na transcrição: ' + (e && e.message || e), 'err');
    } finally { S.busy = false; }
  }

  async function start(onText, onStatus) {
    S.onText = onText; S.onStatus = onStatus;
    if (S.on) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      status('Navegador sem getDisplayMedia — use o Chrome.', 'err');
      return false;
    }
    var stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch (e) {
      status('Compartilhamento cancelado.', 'warn');
      return false;
    }
    var atrk = stream.getAudioTracks();
    if (!atrk.length) {
      status('Sem faixa de áudio. Na janela de compartilhar, marque "Compartilhar áudio da aba/sistema".', 'err');
      stream.getTracks().forEach(function (t) { t.stop(); });
      return false;
    }
    stream.getVideoTracks().forEach(function (t) { t.stop(); }); // vídeo não é usado
    S.stream = stream;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      S.actx = new AC({ sampleRate: S.sr });
      S.src = S.actx.createMediaStreamSource(new MediaStream([atrk[0]]));
      var node = S.actx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = function (ev) {
        if (!S.on) return;
        S.buf.push(new Float32Array(ev.inputBuffer.getChannelData(0)));
        processBuffer();
      };
      // sink com ganho 0: ScriptProcessor precisa de destino, mas NÃO queremos
      // tocar o áudio de volta (evita eco/feedback no fone do SDR).
      S.sink = S.actx.createGain(); S.sink.gain.value = 0;
      S.src.connect(node); node.connect(S.sink); S.sink.connect(S.actx.destination);
      S.node = node;
      S.on = true;
      atrk[0].addEventListener('ended', function () { stop(); }); // parou pela barra do Chrome
      status('Ouvindo o áudio da call', 'ok');
      ensureModel(); // pré-carrega o modelo em paralelo
      return true;
    } catch (e) {
      status('Erro ao iniciar a captura: ' + (e && e.message || e), 'err');
      stop();
      return false;
    }
  }

  function stop() {
    S.on = false;
    try { S.node && S.node.disconnect(); } catch (e) {}
    try { S.sink && S.sink.disconnect(); } catch (e) {}
    try { S.src && S.src.disconnect(); } catch (e) {}
    try { S.actx && S.actx.close(); } catch (e) {}
    try { S.stream && S.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    S.node = S.sink = S.src = S.actx = S.stream = null; S.buf = [];
    status('Captura da call parada.', 'info');
  }

  window.JarvisCallSTT = {
    start: start,
    stop: stop,
    isOn: function () { return S.on; },
    engine: function () { return S.engine; },
    supported: function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia); }
  };
})();
