// ga4_oauth_setup.js — autoriza o GA4 via OAuth (login do Ruda) e salva o refresh token.
// Rodar 1x: node scripts/integrations/ga4_oauth_setup.js
// PRE-REQUISITO: o OAuth client precisa ter "http://localhost:8088" nas Authorized redirect URIs.
const LOCAL = 'C:/Users/Ruds/.epiuse-optimizer/node_modules';
const { google } = require(LOCAL + '/googleapis');
const http = require('http');
const fs = require('fs');

const SEC = 'C:/Users/Ruds/.epiuse-optimizer/.secrets';
const client = JSON.parse(fs.readFileSync(SEC + '/ga4-oauth.json', 'utf8')).web;
const PORT = 8088;
const REDIRECT = 'http://localhost:' + PORT;
const oauth2 = new google.auth.OAuth2(client.client_id, client.client_secret, REDIRECT);
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/analytics.readonly'],
});

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/?')) { res.end('aguardando login...'); return; }
  try {
    const code = new URL(req.url, REDIRECT).searchParams.get('code');
    const { tokens } = await oauth2.getToken(code);
    fs.writeFileSync(SEC + '/ga4-oauth-token.json', JSON.stringify(tokens, null, 2));
    res.end('GA4 autorizado com sucesso! Pode fechar esta aba e voltar pro Claude.');
    console.log('\n[OK] refresh_token salvo em .secrets/ga4-oauth-token.json');
    oauth2.setCredentials(tokens);
    const admin = google.analyticsadmin({ version: 'v1beta', auth: oauth2 });
    const r = await admin.accountSummaries.list();
    const sums = r.data.accountSummaries || [];
    if (!sums.length) console.log('[!] Logou mas nao ve propriedades — sua conta precisa ter acesso ao GA4 da EPI-USE.');
    for (const a of sums) {
      console.log('Conta:', a.displayName);
      for (const p of (a.propertySummaries || [])) console.log('  >> ' + p.displayName + '  |  PROPERTY ID = ' + p.property);
    }
    setTimeout(() => server.close(), 500);
  } catch (e) {
    res.end('Erro: ' + e.message);
    console.error('[ERRO]', e.message);
  }
});

server.listen(PORT, () => {
  console.log('\n=== AUTORIZACAO GA4 (OAuth) ===');
  console.log('1) Abra esta URL no navegador (logado com a conta que tem GA4):\n');
  console.log(authUrl);
  console.log('\n2) Faca login + clique "Permitir". Vai redirecionar pra localhost:8088 e salvar o token.\n');
});
