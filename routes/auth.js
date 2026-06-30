const express = require('express');
const router = express.Router();
const path = require('path');
const { 
  SSO_ENABLED, 
  msalClient, 
  SSO_SCOPES, 
  SSO_REDIRECT, 
  SSO_DOMAINS, 
  requireEditorToken,
  IS_LOCAL_DEV,
  PORT
} = require('../server-context');
const { upsertUser, profileFor } = require('./users');

// API status do SSO
router.get('/api/auth/status', (req, res) => {
  const u = req.session && req.session.user;
  res.json({
    role: u ? (u.role || 'hub') : null,
    persona: u ? (u.persona || null) : null,
    enabled: SSO_ENABLED, 
    enforce: process.env.SSO_ENFORCE === 'true', 
    authenticated: !!u, 
    user: u || null 
  });
});

// Inicia fluxo de login do Azure AD
router.get('/auth/login', async (req, res) => {
  if (!SSO_ENABLED) return res.status(503).send('SSO Microsoft não configurado neste ambiente.');
  try {
    req.session.returnTo = req.query.returnTo || '/';
    const url = await msalClient.getAuthCodeUrl({ 
      scopes: SSO_SCOPES, 
      redirectUri: SSO_REDIRECT, 
      prompt: 'select_account' 
    });
    res.redirect(url);
  } catch(e){ 
    console.error('[sso] login err', e); 
    res.status(500).send('Erro ao iniciar login: ' + e.message); 
  }
});

// Callback do Azure AD
router.get('/auth/callback', async (req, res) => {
  if (!SSO_ENABLED) return res.status(503).send('SSO não configurado.');
  if (req.query.error) return res.status(400).send('Login negado pelo Microsoft: ' + (req.query.error_description || req.query.error));
  try {
    const r = await msalClient.acquireTokenByCode({ 
      code: req.query.code, 
      scopes: SSO_SCOPES, 
      redirectUri: SSO_REDIRECT 
    });
    const acc = r.account || {};
    const claims = r.idTokenClaims || {};
    const email = (acc.username || claims.preferred_username || claims.email || '').toLowerCase();
    const domain = email.split('@')[1] || '';
    if (SSO_DOMAINS.length && !SSO_DOMAINS.includes(domain)) {
      return req.session.destroy(() => res.status(403).send('Acesso restrito a EPI-USE. O domínio "' + domain + '" não está autorizado.'));
    }
    const name = acc.name || claims.name || email;
    const oid = acc.homeAccountId || claims.oid || null;
    // upsert no DB de users + resolve role/persona/landing
    const dbUser = upsertUser({ email, name, oid });
    const prof = profileFor(dbUser);
    req.session.user = {
      email,
      name,
      given: claims.given_name || '',
      oid,
      role: prof.role,
      persona: prof.persona,
      admin: prof.admin,
      loginAt: new Date().toISOString()
    };
    // Marketing Hub é a tela central de quem não é do núcleo (role 'hub').
    // Se o usuário não pediu uma rota específica, manda pro landing do role.
    const explicit = req.session.returnTo && req.session.returnTo !== '/';
    const back = explicit ? req.session.returnTo : prof.landing;
    delete req.session.returnTo;
    res.redirect(back);
  } catch(e){ 
    console.error('[sso] callback err', e); 
    res.status(500).send('Erro no callback do login: ' + e.message); 
  }
});

// Logout — encerra a sessão do app de forma confiável e volta pra tela de login.
// (Mesma-domínio, não depende de post-logout URI registrada no Azure.) O
// re-login usa prompt:'select_account', então trocar de conta funciona.
router.get('/auth/logout', (req, res) => {
  const done = () => { try { res.clearCookie('eubr.sid'); } catch {} res.redirect('/login'); };
  if (req.session) req.session.destroy(done); else done();
});

// RD Station OAuth2 callback
router.get('/auth/rd-callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('faltou ?code= na URL');
  if (!process.env.RD_CLIENT_ID || !process.env.RD_CLIENT_SECRET) {
    return res.status(503).send('RD_CLIENT_ID/RD_CLIENT_SECRET não definidos no servidor');
  }
  try {
    const rd = require(path.join(__dirname, '../scripts/integrations/rd_fetch.js'));
    const tokens = await rd.exchangeCodeForTokens(code);
    rd.writeTokens({
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      atualizado_em: new Date().toISOString(),
    });
    res.send(`<h1>RD conectado OK</h1>
      <p>refresh_token salvo em <code>${rd.TOKENS_PATH}</code>.</p>
      <p><b>Importante:</b> copie o refresh_token abaixo e adicione como env var <code>RD_REFRESH_TOKEN</code> no Railway:</p>
      <pre style="background:#f4f4f4;padding:12px;border-radius:6px;word-wrap:break-word;white-space:pre-wrap">${tokens.refresh_token}</pre>
      <p>Em seguida, rode <code>POST /api/relatorio/rd-refresh</code> com X-Editor-Token para popular o snapshot.</p>`);
  } catch (e) {
    res.status(500).send('Erro trocando code por token: ' + e.message);
  }
});

// POST /api/relatorio/rd-refresh
router.post('/api/relatorio/rd-refresh', requireEditorToken, async (req, res) => {
  try {
    const rd = require(path.join(__dirname, '../scripts/integrations/rd_fetch.js'));
    const out = await rd.fetchRD();
    res.json({
      success: true,
      segmentations: out.segmentations?.total ?? null,
      workflows: out.workflows?.total ?? null,
      workflows_ativos: out.workflows?.ativos ?? null,
      forms: out.forms?.total ?? null,
      landing_pages: out.landing_pages?.total ?? null,
      emails: out.emails?.total ?? null,
      atualizado_em: out.atualizado_em,
      errors: out.errors || [],
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
