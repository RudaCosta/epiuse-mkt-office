/**
 * cmo-v2.js — Módulo do Escritório Virtual EPI-USE
 * Injeta dinamicamente a "Visão CMO V2" nas 5 páginas principais do Command Center.
 * Proporciona uma interface visual de alta fidelidade baseada em dados B2B SAP.
 */

(function() {
  // Injetar estilos CSS necessários
  const style = document.createElement('style');
  style.textContent = `
    /* Switch de Visão CMO */
    .cmo-v2-toggle-wrap {
      position: fixed;
      bottom: 24px;
      left: 24px;
      background: rgba(12, 8, 31, 0.9);
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      border: 1px solid rgba(168, 85, 247, 0.4);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
      padding: 10px 16px;
      border-radius: 30px;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Poppins', 'Source Sans 3', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: #fbbf24;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .cmo-v2-toggle-wrap:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(168, 85, 247, 0.4);
      border-color: rgba(251, 191, 36, 0.8);
    }
    .cmo-v2-switch {
      position: relative;
      display: inline-block;
      width: 38px;
      height: 20px;
    }
    .cmo-v2-switch input {
      opacity: 0; width: 0; height: 0;
    }
    .cmo-v2-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255,255,255,0.15);
      transition: .4s;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .cmo-v2-slider:before {
      position: absolute;
      content: "";
      height: 12px; width: 12px;
      left: 3px; bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    input:checked + .cmo-v2-slider {
      background-color: #fbbf24;
    }
    input:checked + .cmo-v2-slider:before {
      transform: translateX(18px);
    }

    /* Sistema de exibição V1 vs CMO V2 */
    body.cmo-v2-active .v1-only { display: none !important; }
    body:not(.cmo-v2-active) .cmo-only { display: none !important; }

    /* Cards e Grid na Visão CMO */
    .cmo-wrap {
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px;
      animation: fadeInCMO 0.4s ease-out;
    }
    @keyframes fadeInCMO {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .cmo-header {
      margin-bottom: 28px;
      position: relative;
    }
    .cmo-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #f3e8ff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cmo-header .cmo-badge-cmo {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(236, 72, 153, 0.2));
      color: #fbbf24;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid rgba(251, 191, 36, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
    }
    .cmo-header p {
      color: #a78bfa;
      font-size: 13px;
      margin-top: 6px;
    }
    .cmo-card {
      background: rgba(26, 17, 60, 0.45) !important;
      backdrop-filter: blur(16px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
      border: 1px solid rgba(168, 85, 247, 0.2) !important;
      border-radius: 16px !important;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
      padding: 22px;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
      color: #f3e8ff !important;
      transition: transform 0.25s ease, border-color 0.25s ease;
    }
    .cmo-card:hover {
      transform: translateY(-2px);
      border-color: rgba(168, 85, 247, 0.45) !important;
    }
    .cmo-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #fbbf24, #ec4899, #a855f7);
      opacity: 0.8;
      z-index: 1;
    }
    .cmo-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .cmo-kpi-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
      transition: background 0.2s;
    }
    .cmo-kpi-card:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    .cmo-lbl {
      font-size: 11px;
      color: #a78bfa;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .cmo-num {
      font-size: 32px;
      font-weight: 800;
      color: #fbbf24;
      font-family: 'Fira Code', 'JetBrains Mono', monospace;
      line-height: 1;
    }
    .cmo-trend {
      font-size: 11px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .cmo-trend.up { color: #10b981; }
    .cmo-trend.neutral { color: #94a3b8; }
    .cmo-bar-bg {
      height: 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 4px;
      margin-top: 10px;
      overflow: hidden;
      position: relative;
    }
    .cmo-bar-fill {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #fbbf24, #ec4899);
    }
    .cmo-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 13px;
    }
    .cmo-table th {
      text-align: left;
      color: #a78bfa;
      padding: 8px 12px;
      font-weight: 600;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .cmo-table td {
      padding: 10px 12px;
      color: #e2e8f0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .cmo-table tr:hover td {
      background: rgba(255,255,255,0.02);
    }
  `;
  document.head.appendChild(style);

  // Mapeamento de Layouts CMO V2 por Rota
  const CMO_LAYOUTS = {
    home: `
      <div class="cmo-wrap">
        <header class="cmo-header">
          <h1>👔 CMO Command Center <span class="cmo-badge-cmo">Visão V2</span></h1>
          <p>Métricas consolidadas de Atribuição de Funil, Alocação de Fundos de Marketing SAP (MDF) e Desempenho B2B.</p>
        </header>

        <!-- KPI Strip -->
        <div class="cmo-kpi-grid">
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Pipeline Influenciado (MKT)</div>
            <div class="cmo-num">38.2%</div>
            <div class="cmo-trend up">▲ +3.4% MoM (Total R$ 4.2M)</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 38.2%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">SAP MDF Utilização</div>
            <div class="cmo-num">84.0%</div>
            <div class="cmo-trend up">▲ Q2 Claims Em Dia (R$ 142k)</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 84%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Cobertura ABM (Tier-1)</div>
            <div class="cmo-num">64 / 100</div>
            <div class="cmo-trend up">▲ 64% contas-alvo engajadas</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 64%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Leads Sourced (Mês)</div>
            <div class="cmo-num">178</div>
            <div class="cmo-trend up">▲ 92% MQLs qualificados</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 92%"></div></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <!-- Divisão por LOB SAP -->
          <div class="cmo-card">
            <div class="cmo-lbl">Revenue Contribution por LOB SAP</div>
            <table class="cmo-table">
              <thead>
                <tr>
                  <th>LOB SAP</th>
                  <th>Share</th>
                  <th>Sourced Pipeline</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>SAP S/4HANA Cloud</strong></td>
                  <td style="color: #fbbf24">52%</td>
                  <td>R$ 2.184.000</td>
                </tr>
                <tr>
                  <td><strong>SAP SuccessFactors</strong></td>
                  <td style="color: #fbbf24">31%</td>
                  <td>R$ 1.302.000</td>
                </tr>
                <tr>
                  <td><strong>SAP BTP (Technology Platform)</strong></td>
                  <td style="color: #fbbf24">17%</td>
                  <td>R$ 714.000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Alertas Críticos do CMO -->
          <div class="cmo-card">
            <div class="cmo-lbl" style="color:#ef4444">🔴 Alertas & Ações Estratégicas</div>
            <ul style="margin-top: 14px; list-style: none; font-size: 13px; line-height: 1.8;">
              <li style="margin-bottom: 10px; display: flex; gap: 8px; align-items: flex-start;">
                <span>⚠️</span> <span><strong>claims de MDF SAP Q2:</strong> R$ 28k aguardando aprovação final da Duda antes do fechamento (dia 30).</span>
              </li>
              <li style="margin-bottom: 10px; display: flex; gap: 8px; align-items: flex-start;">
                <span>📊</span> <span><strong>Qbr SAP Target:</strong> Campanha conjunta de BTP está com engajamento abaixo da meta (45% vs 60%).</span>
              </li>
              <li style="margin-bottom: 10px; display: flex; gap: 8px; align-items: flex-start;">
                <span>👔</span> <span><strong>Voices Advocacy:</strong> Roberto (Country Manager) precisa postar sobre o Case 4me para bater a meta de SoV.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    `,
    relatorio: `
      <div class="cmo-wrap">
        <header class="cmo-header">
          <h1>👔 Funnel Intelligence & ROI <span class="cmo-badge-cmo">Visão V2</span></h1>
          <p>Métricas avançadas de conversão, custos de aquisição e atribuição de receita digital.</p>
        </header>

        <div class="cmo-kpi-grid">
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">MQL → SQL Conversão</div>
            <div class="cmo-num">18.2%</div>
            <div class="cmo-trend up">▲ Meta: 15% (+3.2% acima)</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 100%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">CAC Médio LOB SAP</div>
            <div class="cmo-num">R$ 12.450</div>
            <div class="cmo-trend up">▼ -12% redução de custo</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 88%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">LTV : CAC Ratio</div>
            <div class="cmo-num">14.4x</div>
            <div class="cmo-trend up">▲ Excelente (Mercado B2B > 3x)</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="style: 100%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Influenced Pipeline</div>
            <div class="cmo-num">R$ 4.2M</div>
            <div class="cmo-trend up">▲ Sourced R$ 1.84M direta</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 100%"></div></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <!-- Modelos de Atribuição -->
          <div class="cmo-card">
            <div class="cmo-lbl">Atribuição de Canais (Multi-Touch Pipeline)</div>
            <table class="cmo-table">
              <thead>
                <tr>
                  <th>Canal</th>
                  <th>Influência</th>
                  <th>Origem Típica</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>LinkedIn Ads</strong></td>
                  <td style="color:#fbbf24">45%</td>
                  <td>First-Touch (Descoberta)</td>
                </tr>
                <tr>
                  <td><strong>Eventos (Tática Elefante)</strong></td>
                  <td style="color:#fbbf24">35%</td>
                  <td>Mid-Touch (Consideração)</td>
                </tr>
                <tr>
                  <td><strong>EPI-USE Voices (Organic)</strong></td>
                  <td style="color:#fbbf24">20%</td>
                  <td>Last-Touch (Conversão/Fecho)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- CAC por LOB -->
          <div class="cmo-card">
            <div class="cmo-lbl">Pipeline e CAC por LOB SAP (Maio 2026)</div>
            <table class="cmo-table">
              <thead>
                <tr>
                  <th>LOB SAP</th>
                  <th>CAC Unitário</th>
                  <th>Pipeline</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>SAP S/4HANA</td>
                  <td>R$ 14.200</td>
                  <td style="color:#fbbf24;font-family:monospace">R$ 2.2M</td>
                </tr>
                <tr>
                  <td>SuccessFactors</td>
                  <td>R$ 11.500</td>
                  <td style="color:#fbbf24;font-family:monospace">R$ 1.4M</td>
                </tr>
                <tr>
                  <td>SAP BTP</td>
                  <td>R$ 9.800</td>
                  <td style="color:#fbbf24;font-family:monospace">R$ 0.6M</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `,
    voices: `
      <div class="cmo-wrap">
        <header class="cmo-header">
          <h1>👔 Advocacy & Social Selling <span class="cmo-badge-cmo">Visão V2</span></h1>
          <p>Mapeamento de Share of Voice (SoV), alcance unificado e pipeline originado via rede dos executivos.</p>
        </header>

        <div class="cmo-kpi-grid">
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Share of Voice (SAP Ecosystem BR)</div>
            <div class="cmo-num">28.5%</div>
            <div class="cmo-trend up">▲ Meta: 25% (+3.5% acima)</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 100%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Alcance Advocacy (Mensal)</div>
            <div class="cmo-num">420k</div>
            <div class="cmo-trend up">▲ Impressões orgânicas totais</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 90%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Pipeline Sourced via Voices</div>
            <div class="cmo-num">R$ 980k</div>
            <div class="cmo-trend up">▲ Zoho Deals (Social Selling)</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 100%"></div></div>
          </div>
        </div>

        <div class="cmo-card">
          <div class="cmo-lbl">Leaderboard de Advocacy & Performance (Maio 2026)</div>
          <table class="cmo-table">
            <thead>
              <tr>
                <th>Voice (Executivo)</th>
                <th>SSI LinkedIn</th>
                <th>Seguidores</th>
                <th>Alcance (Imp)</th>
                <th>Pipeline Sourced</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Anderson Costa</strong> (SAP SuccessFactors)</td>
                <td>82 <span style="color:#10b981">▲</span></td>
                <td>8.341</td>
                <td>140k</td>
                <td style="color:#fbbf24;font-family:monospace">R$ 450.000</td>
              </tr>
              <tr>
                <td><strong>Carlos Furigo</strong> (S/4HANA & Logistics)</td>
                <td>78 <span style="color:#10b981">▲</span></td>
                <td>3.450</td>
                <td>98k</td>
                <td style="color:#fbbf24;font-family:monospace">R$ 320.000</td>
              </tr>
              <tr>
                <td><strong>Rudá Costa</strong> (RevOps & MKT)</td>
                <td>89 <span style="color:#10b981">▲</span></td>
                <td>12.500</td>
                <td>182k</td>
                <td style="color:#fbbf24;font-family:monospace">R$ 210.000</td>
              </tr>
              <tr>
                <td><strong>Roberto</strong> (Country Manager)</td>
                <td>74 <span style="color:#94a3b8">■</span></td>
                <td>11.000</td>
                <td>--</td>
                <td style="color:#cbd5e1">Aguardando Post</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
    'field-marketing': `
      <div class="cmo-wrap">
        <header class="cmo-header">
          <h1>👔 Tática Elefante Enterprise <span class="cmo-badge-cmo">Visão V2</span></h1>
          <p>Métricas de engajamento de contas-alvo e ROI de pipeline gerado via eventos de relacionamento.</p>
        </header>

        <div class="cmo-kpi-grid">
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Target Account Attendance</div>
            <div class="cmo-num">78%</div>
            <div class="cmo-trend up">▲ 78 de 100 Contas Engajadas</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 78%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Event Multiplier ROI</div>
            <div class="cmo-num">4.8x</div>
            <div class="cmo-trend up">▲ Pipeline Gerado vs Custo Evento</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 96%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Post-Event SLA Cadence</div>
            <div class="cmo-num">72%</div>
            <div class="cmo-trend up">▲ Leads nutridos em até 5 dias</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 72%"></div></div>
          </div>
        </div>

        <div class="cmo-card">
          <div class="cmo-lbl">ASUG & VIP Events Pipeline Impact (Q2 2026)</div>
          <table class="cmo-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Custo Total</th>
                <th>Contas Decisoras</th>
                <th>Pipeline Sourced</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>SAP Forum 2026</strong> (Estande + Keynote)</td>
                <td>R$ 85.000</td>
                <td>42</td>
                <td style="color:#fbbf24;font-family:monospace">R$ 680.000</td>
                <td style="color:#10b981;font-weight:bold">8.0x</td>
              </tr>
              <tr>
                <td><strong>SuccessFactors Roadshow</strong> (Foco RH)</td>
                <td>R$ 32.000</td>
                <td>18</td>
                <td style="color:#fbbf24;font-family:monospace">R$ 340.000</td>
                <td style="color:#10b981;font-weight:bold">10.6x</td>
              </tr>
              <tr>
                <td><strong>VIP Executive Savanna Dinner</strong> (ABM VIP)</td>
                <td>R$ 18.000</td>
                <td>12</td>
                <td style="color:#fbbf24;font-family:monospace">R$ 420.000</td>
                <td style="color:#10b981;font-weight:bold">23.3x</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `,
    pipeline: `
      <div class="cmo-wrap">
        <header class="cmo-header">
          <h1>👔 SDR Velocity Dashboard <span class="cmo-badge-cmo">Visão V2</span></h1>
          <p>Eficiência da equipe de prospecção, SLAs de resposta e velocidade de avanço comercial.</p>
        </header>

        <div class="cmo-kpi-grid">
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Lead Acceptance Rate (SAL)</div>
            <div class="cmo-num">92.4%</div>
            <div class="cmo-trend up">▲ AEs aceitam oportunidades em até 24h</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 92.4%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Inbound Response SLA</div>
            <div class="cmo-num">14 min</div>
            <div class="cmo-trend up">▲ Meta: < 30 min (Excelente)</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 100%"></div></div>
          </div>
          <div class="cmo-kpi-card">
            <div class="cmo-lbl">Sales Velocity (MQL → Deal)</div>
            <div class="cmo-num">42 dias</div>
            <div class="cmo-trend up">▼ -6 dias de ciclo médio</div>
            <div class="cmo-bar-bg"><div class="cmo-bar-fill" style="width: 85%"></div></div>
          </div>
        </div>

        <div class="cmo-card">
          <div class="cmo-lbl">Pipeline Funnel & Conversion Rates (SDR + Inbound)</div>
          <table class="cmo-table">
            <thead>
              <tr>
                <th>Estágio do Funil</th>
                <th>Volume (Contatos)</th>
                <th>Conversão Parcial</th>
                <th>Valor Estimado (R$)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. Inbound Leads / Target List</strong></td>
                <td>420</td>
                <td style="color:#a78bfa">--</td>
                <td style="color:#94a3b8">--</td>
              </tr>
              <tr>
                <td><strong>2. MQLs (Contatos Qualificados)</strong></td>
                <td>180</td>
                <td style="color:#fbbf24">42.8%</td>
                <td style="color:#94a3b8">--</td>
              </tr>
              <tr>
                <td><strong>3. SQLs / SALs (Oportunidades no CRM)</strong></td>
                <td>120</td>
                <td style="color:#fbbf24">66.6%</td>
                <td style="color:#fbbf24;font-family:monospace">R$ 11.200.000</td>
              </tr>
              <tr>
                <td><strong>4. Propostas Emitidas</strong></td>
                <td>42</td>
                <td style="color:#fbbf24">35.0%</td>
                <td style="color:#fbbf24;font-family:monospace">R$ 4.200.000</td>
              </tr>
              <tr>
                <td><strong>5. Deals Ganhos (Fechado)</strong></td>
                <td>12</td>
                <td style="color:#fbbf24">28.5%</td>
                <td style="color:#fbbf24;font-family:monospace">R$ 1.840.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `
  };

  // Inicialização no DOM
  function init() {
    const route = document.body.dataset.route;
    if (!route || !CMO_LAYOUTS[route]) return; // Apenas nas 5 rotas mapeadas

    // 1. Envolver o conteúdo atual em .v1-only
    // Pegar todos os filhos diretos do body, exceto office-nav, office-footer, scripts, links
    const v1Wrapper = document.createElement('div');
    v1Wrapper.className = 'v1-only';
    
    const nodesToMove = [];
    document.body.childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        if (tag !== 'office-nav' && tag !== 'office-footer' && tag !== 'script' && tag !== 'style' && !node.classList.contains('cmo-v2-toggle-wrap')) {
          nodesToMove.push(node);
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
        nodesToMove.push(node);
      }
    });
    
    // Mover os nós para o wrapper V1
    nodesToMove.forEach(node => {
      v1Wrapper.appendChild(node);
    });
    
    // Inserir o wrapper V1 no body (antes do footer se ele existir)
    const footer = document.querySelector('office-footer');
    if (footer) {
      document.body.insertBefore(v1Wrapper, footer);
    } else {
      document.body.appendChild(v1Wrapper);
    }

    // 2. Injetar a visão CMO V2 em .cmo-only
    const cmoWrapper = document.createElement('div');
    cmoWrapper.className = 'cmo-only';
    cmoWrapper.innerHTML = CMO_LAYOUTS[route];
    
    if (footer) {
      document.body.insertBefore(cmoWrapper, footer);
    } else {
      document.body.appendChild(cmoWrapper);
    }

    // 3. Injetar o botão flutuante de toggle
    const toggleWrap = document.createElement('div');
    toggleWrap.className = 'cmo-v2-toggle-wrap';
    toggleWrap.innerHTML = `
      <span>👔 Visão CMO V2</span>
      <label class="cmo-v2-switch">
        <input type="checkbox" id="cmo-v2-checkbox">
        <span class="cmo-v2-slider"></span>
      </label>
    `;
    document.body.appendChild(toggleWrap);

    const checkbox = document.getElementById('cmo-v2-checkbox');

    // 4. Carregar estado anterior do switch
    const isModeActive = localStorage.getItem('cmo.v2.mode') === 'active';
    if (isModeActive) {
      document.body.classList.add('cmo-v2-active');
      checkbox.checked = true;
    }

    // 5. Configurar listener de mudança
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        document.body.classList.add('cmo-v2-active');
        localStorage.setItem('cmo.v2.mode', 'active');
      } else {
        document.body.classList.remove('cmo-v2-active');
        localStorage.setItem('cmo.v2.mode', 'inactive');
      }
      // Emitir evento para recalcular gráficos caso necessário
      window.dispatchEvent(new Event('resize'));
    });
  }

  // Roda assim que o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
