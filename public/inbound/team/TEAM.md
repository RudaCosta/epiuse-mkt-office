# Time de Marketing — EPI-USE Brasil &amp; StratView

Reference card dos integrantes do time de Marketing.
Use ao popular o módulo **Painel · Team**, o **War Room · Time** e qualquer fonte única de "Time" depois da consolidação proposta no UX-AUDIT.

---

## Novos talentos (StratView — slide oficial)

Origem: deck institucional StratView (slide "Novos Talentos no Time").
Imagem: `team/novos-talentos-stratview.png`

| # | Nome | Área | Notas |
|---|---|---|---|
| 1 | **Bruna Yamagami** | Marketing Intelligence &amp; CRM | dados, segmentação, CRM ops |
| 2 | **Guilherme Marques** | Growth Hacking &amp; Performance | mídia paga, funil, experimentação |
| 3 | **Isabela Carvalho** | Field Marketing | eventos presenciais, MDF, ativações |
| 4 | **Marlison Estrela** | Development Sales (SDR) | prospecção, qualificação, hand-off |
| 5 | **Eduarda Hirose** | Brand Experience | identidade, narrativa, design ops |

---

## Time pré-existente (já citado em telas do Office Engine)

Vindo das telas do War Room / Painel da Duda atuais. Inclui pra ter o roster completo num só lugar.

| Nome | Área | Notas |
|---|---|---|
| **Rudá Costa** | Head RevOps &amp; Marketing | dono do projeto Office Engine, by Ruds |
| **Bruna Yamagami** | MKT Intelligence &amp; CRM | ↑ duplicado intencional — confirma a área |
| **Isabela de Oliveira** ⚠️ | Eventos &amp; MDF | **conferir** — no War Room aparece "Isabela de Oliveira", no slide aparece "Isabela Carvalho · Field Marketing". Pode ser pessoa diferente ou inconsistência de nome. |
| **Gui** | Growth &amp; IA | provavelmente é o Guilherme Marques (mesmo Growth) |
| **Lisiane (Redatoria)** | Tom de Voz | revisão editorial, redatoria |
| **Duda** | Brand Experience | dona do Painel — pode coincidir com Eduarda Hirose |
| **Roberto** | Country Manager | budget, alinhamento estratégico |
| **Marlison Estrela** | Development Sales | ↑ confirmado entre as duas listas |

---

## Conflitos a resolver (pra Duda confirmar)

1. **Isabela** — Carvalho (Field Marketing) vs de Oliveira (Eventos &amp; MDF). Field Marketing e Eventos podem ser a mesma função descrita de jeitos diferentes; ou são duas pessoas. Verificar.
2. **Gui x Guilherme Marques** — "Gui · Growth &amp; IA" no War Room provavelmente é o Guilherme Marques (Growth Hacking). Nome curto vs completo.
3. **Duda x Eduarda Hirose** — "Duda · Brand Experience" no War Room bate exato com "Eduarda Hirose · Brand Experience" do slide StratView. Confirmar se é a mesma pessoa (Duda = apelido de Eduarda).

---

## Mapping recomendado pro Painel

Quando a Sprint v3.2 do UX-AUDIT (fonte única de "Time") for executada, sugiro este schema na fonte de verdade:

```json
{
  "team": [
    { "id": "ruda",      "name": "Rudá Costa",        "role": "Head RevOps &amp; Marketing", "owner_of": ["office-engine"] },
    { "id": "duda",      "name": "Eduarda Hirose",    "alias": "Duda", "role": "Brand Experience",  "owner_of": ["painel", "brand"] },
    { "id": "roberto",   "name": "Roberto",           "role": "Country Manager" },
    { "id": "lisiane",   "name": "Lisiane de Assis",  "role": "Redatoria · Tom de Voz" },
    { "id": "bruna",     "name": "Bruna Yamagami",    "role": "MKT Intelligence &amp; CRM" },
    { "id": "gui",       "name": "Guilherme Marques", "alias": "Gui", "role": "Growth Hacking &amp; Performance · IA" },
    { "id": "isabela",   "name": "Isabela Carvalho",  "role": "Field Marketing · Eventos &amp; MDF" },
    { "id": "marlison",  "name": "Marlison Estrela",  "role": "Development Sales (SDR)" }
  ]
}
```

Foto opcional por integrante. Vincular cada Voice/owner de ferramenta a um `team.id`.
