/**
 * graph_fetch.js — Módulo 25 · Fase 2
 * Baixa a planilha do Calendário Editorial direto do OneDrive/SharePoint da nuvem,
 * via Microsoft Graph, usando o MESMO app do Azure que já roda o SSO do Office
 * (AZURE_CLIENT_ID / AZURE_TENANT_ID / AZURE_CLIENT_SECRET).
 *
 * Fluxo: client-credentials (app-only) → token Graph → /shares/{id}/driveItem/content
 *
 * ⚠️ DEPENDÊNCIA DE TI (bloqueia a Fase 2):
 *   O app do Azure precisa da permissão de APLICATIVO `Files.Read.All`
 *   (ou `Sites.Read.All`) + admin consent. Mesma pessoa que aprovou o SSO faz.
 *   Sem isso, o Graph devolve 403 e o resync cai pro fallback da cópia local.
 *
 * Config (.env):
 *   EDITORIAL_SHARE_URL = link de compartilhamento da planilha (OneDrive/SharePoint)
 *   AZURE_CLIENT_ID / AZURE_TENANT_ID / AZURE_CLIENT_SECRET  (já existem pro SSO)
 */

// Link default = o que a Bruna passou (personal OneDrive do TI). Trocar via env.
const DEFAULT_SHARE_URL =
  'https://epiusebr-my.sharepoint.com/:x:/g/personal/ti_brasil_epiuse_com_br/IQB2ZHlp5r_lRr_efszvG-WZAVuGFhK1-gtu4OoMlYUfnCI?e=bIxhpH';

// share URL → token do Graph (u! + base64url sem padding)
function encodeShareUrl(shareUrl) {
  const b64 = Buffer.from(shareUrl, 'utf8').toString('base64');
  return 'u!' + b64.replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
}

async function getAppToken() {
  const tenant = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const secret = process.env.AZURE_CLIENT_SECRET;
  if (!tenant || !clientId || !secret) {
    throw new Error('AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET não configurados (o SSO os define).');
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Token Graph falhou (${r.status}): ${j.error_description || j.error || 'erro'}`);
  return j.access_token;
}

/**
 * Baixa o .xlsx da nuvem e grava em destPath.
 * @param {string} destPath  caminho local onde salvar
 * @param {string} [shareUrl]
 */
async function fetchEditorialXlsx(destPath, shareUrl) {
  const fs = require('fs');
  const path = require('path');
  const url = shareUrl || process.env.EDITORIAL_SHARE_URL || DEFAULT_SHARE_URL;
  const token = await getAppToken();
  const shareId = encodeShareUrl(url);
  const endpoint = `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem/content`;

  const r = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, redirect: 'follow' });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    if (r.status === 403) {
      throw new Error('Graph 403 — o app do Azure ainda não tem permissão de aplicativo `Files.Read.All`/`Sites.Read.All` + admin consent. Peça pra TI liberar (Fase 2). Enquanto isso, o resync usa a cópia local.');
    }
    throw new Error(`Graph ${r.status}: ${txt.slice(0, 300)}`);
  }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  console.log(`[graph] baixado ${buf.length} bytes → ${destPath}`);
  return destPath;
}

module.exports = { fetchEditorialXlsx, encodeShareUrl, getAppToken };

// Execução direta pra teste: node scripts/integrations/graph_fetch.js <destino>
if (require.main === module) {
  try { require('dotenv').config({ path: require('path').join(__dirname, '../../.env') }); } catch {}
  const dest = process.argv[2] || require('path').join(__dirname, '../../vault/00-contexto/conteudo/calendario-editorial-marketing.xlsx');
  fetchEditorialXlsx(dest).then(p => console.log('OK:', p)).catch(e => { console.error('ERRO:', e.message); process.exit(1); });
}
