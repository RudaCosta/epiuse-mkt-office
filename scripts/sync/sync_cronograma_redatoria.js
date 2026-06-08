/**
 * sync_cronograma_redatoria.js
 * Baixa a planilha "Cronograma EPI-USE Brasil 2025-2026" do Google Drive
 * e salva local em vault/00-contexto/conteudo/cronograma-redatoria-2025.xlsx
 *
 * Requer: GOOGLE_ACCESS_TOKEN no .env (ou usa token OAuth2 já configurado)
 * Alternativa sem token: baixar manualmente e salvar no path abaixo.
 *
 * Uso:
 *   node scripts/sync/sync_cronograma_redatoria.js
 *
 * Fonte: Google Sheets ID 1KfnsRY_gDTSLx3w-SDvFuJtIzkW6kMgNfbsYt_EJ2uM
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs   = require('fs');
const path = require('path');

const SHEET_ID  = '1KfnsRY_gDTSLx3w-SDvFuJtIzkW6kMgNfbsYt_EJ2uM';
const OUT_PATH  = path.join(__dirname, '../../vault/00-contexto/conteudo/cronograma-redatoria-2025.xlsx');
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;

async function sync() {
  const token = process.env.GOOGLE_ACCESS_TOKEN;

  if (!token) {
    console.error('[redatoria-sync] GOOGLE_ACCESS_TOKEN nao encontrado no .env');
    console.error('  Opcao manual: abra a URL abaixo no Chrome (autenticado) e salve o arquivo em:');
    console.error('  ' + EXPORT_URL);
    console.error('  ' + OUT_PATH);
    process.exit(1);
  }

  console.log('[redatoria-sync] Baixando cronograma do Google Drive...');

  const res = await fetch(EXPORT_URL, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    console.error(`[redatoria-sync] Erro HTTP ${res.status}: ${res.statusText}`);
    process.exit(1);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, buf);

  console.log(`[redatoria-sync] OK — ${buf.length} bytes gravados em ${OUT_PATH}`);
  console.log('[redatoria-sync] Endpoint disponivel em: /api/planilhas/cronograma-redatoria');
}

sync().catch(e => { console.error(e); process.exit(1); });
