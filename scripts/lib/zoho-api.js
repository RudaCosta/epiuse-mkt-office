// Zoho CRM pela API REST, sem precisar de sessão Claude (Módulo 36).
//
// Credencial: um "Self Client" no console da Zoho (api-console.zoho.com) com o
// escopo ZohoCRM.coql.READ,ZohoCRM.modules.READ gera o refresh token. No Railway:
//   ZOHO_CLIENT_ID · ZOHO_CLIENT_SECRET · ZOHO_REFRESH_TOKEN · ZOHO_DC (com|eu|in|com.au|jp|ca)
// Sem elas, quem chama recebe o erro "faltam ..." e a fonte fica "aguardando
// credencial" em /fontes (nada é inventado no lugar).
const DC = () => String(process.env.ZOHO_DC || 'com').replace(/^\./, '');
const ACCOUNTS = () => process.env.ZOHO_ACCOUNTS_URL || `https://accounts.zoho.${DC()}`;
const API = () => process.env.ZOHO_API_URL || `https://www.zohoapis.${DC()}`;

const FALTAM = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'];
const credenciaisFaltando = () => FALTAM.filter(k => !process.env[k]);

async function zohoToken() {
  const falta = credenciaisFaltando();
  if (falta.length) throw new Error('faltam ' + falta.join(' / '));
  const body = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });
  const r = await fetch(`${ACCOUNTS()}/oauth/v2/token`, { method: 'POST', body });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error(`Zoho não devolveu token (${j.error || r.status}) — confira ZOHO_DC e o refresh token`);
  return j.access_token;
}

// Resposta no mesmo formato da API ({ data: [...], info }); 204 = nenhum registro.
async function coql(token, query) {
  const r = await fetch(`${API()}/crm/v7/coql`, {
    method: 'POST',
    headers: { Authorization: 'Zoho-oauthtoken ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ select_query: String(query).trim().replace(/\s+/g, ' ') }),
  });
  if (r.status === 204) return { data: [] };
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`COQL ${r.status}: ${[j.code, j.message].filter(Boolean).join(' ')}`);
  return j;
}

module.exports = { zohoToken, coql, credenciaisFaltando };
