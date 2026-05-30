// ga4_probe.js — diagnostica acesso do Service Account ao GA4 + descobre o Property ID
// Uso: node scripts/integrations/ga4_probe.js
const LOCAL = 'C:/Users/Ruds/.epiuse-optimizer/node_modules';
const { google } = require(LOCAL + '/googleapis');
const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'C:/Users/Ruds/.epiuse-optimizer/.secrets/ga4-sa.json';

(async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  const admin = google.analyticsadmin({ version: 'v1beta', auth });
  try {
    const res = await admin.accountSummaries.list();
    const summaries = res.data.accountSummaries || [];
    if (!summaries.length) {
      console.log('RESULTADO: Service Account autentica OK, mas NAO ve nenhuma propriedade.');
      console.log('-> Falta: adicionar o email do SA como Viewer numa propriedade GA4 (Admin > Property Access Management).');
      return;
    }
    console.log('RESULTADO: SA tem acesso! Propriedades visiveis:');
    for (const a of summaries) {
      console.log('Conta:', a.displayName, '(' + a.account + ')');
      for (const p of (a.propertySummaries || [])) {
        console.log('  >> ' + p.displayName + '  |  PROPERTY ID = ' + p.property);
      }
    }
  } catch (e) {
    console.log('ERRO:', e.message);
    if (String(e.message).includes('has not been used') || String(e.message).includes('disabled')) {
      console.log('-> Falta: ATIVAR a "Google Analytics Admin API" no projeto do Google Cloud.');
    }
  }
})();
