# Template HTML Visual para Blog EPI-USE Brasil

## Objetivo

Este documento serve como contexto completo para quem for trabalhar na conversão de artigos do blog da EPI-USE Brasil (epiuse.com.br) para o formato HTML visual padronizado. O template foi criado para ser colado diretamente no editor de blog do HubSpot, usando **apenas inline styles** (sem classes CSS externas).

## Identidade Visual

### Cores da marca

| Cor | Hex | Uso |
|-----|-----|-----|
| Midnight Blue | `#001844` | Títulos, textos de destaque, fundos de caixas escuras |
| Vermelho EPI-USE | `#cd1543` | Acentos, bordas de lead, badges, botões CTA, setas de fluxo |
| Azul Claro | `#869ec3` | Bordas de callouts informativos, cards secundários, blockquotes |
| Cinza | `#cfd1d3` | Uso secundário |
| Fundo claro | `#f8f9fc` | Background do sumário |
| Fundo info | `#f0f4fa` | Background de callouts e etapas do fluxo |
| Borda sutil | `#e8ecf0` | Bordas de cards e FAQ |

### Gradiente padrão

```
background: linear-gradient(135deg, #001844 0%, #0a2a5e 100%);
```

Usado em: caixas de destaque, box de resumo, CTA final.

---

## Componentes do Template

Cada artigo usa uma combinação destes blocos visuais. Nem todo artigo precisa de todos. Escolha os que fazem sentido para o conteúdo.

### 1. Lead (parágrafo de abertura com destaque)

Sempre o primeiro elemento. Resume a essência do artigo em 2-3 frases.

```html
<p style="font-size: 1.15em; color: #001844; font-weight: 500; line-height: 1.7; margin-bottom: 1.5em; padding-left: 20px; border-left: 4px solid #cd1543;">
Texto do lead aqui. Deve ser impactante e resumir o tema principal do artigo.
</p>
```

### 2. Sumário ("Neste artigo")

Lista as seções do artigo com links âncora. Cada item tem número vermelho + link.

```html
<div style="background: #f8f9fc; border: 1px solid #e8ecf0; border-radius: 12px; padding: 24px 28px; margin: 2em 0;">
<div style="font-weight: bold; color: #001844; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;">Neste artigo</div>
<div style="padding: 8px 0; border-bottom: 1px solid #eff1f4;"><span style="color: #cd1543; font-weight: bold; margin-right: 12px; font-size: 0.9em;">01</span> <a href="#id-secao" style="color: #001844; text-decoration: none; font-weight: 500;">Título da seção</a></div>
<!-- repetir para cada seção -->
<div style="padding: 8px 0;"><span style="color: #cd1543; font-weight: bold; margin-right: 12px; font-size: 0.9em;">06</span> <a href="#faq" style="color: #001844; text-decoration: none; font-weight: 500;">Perguntas frequentes</a></div>
</div>
```

**Nota:** O último item não tem `border-bottom`.

### 3. Caixa de destaque escura (Dark Gradient Box)

Para informações importantes, listas de pontos-chave ou dados relevantes.

```html
<div style="background: linear-gradient(135deg, #001844 0%, #0a2a5e 100%); color: #ffffff; padding: 24px 28px; border-radius: 12px; margin: 1.5em 0;">
<p style="color: #ffffff; margin-bottom: 0.6em;">Texto de destaque aqui. Pode conter <strong>negrito</strong>.</p>
<p style="color: #ffffff; margin: 0;">Segundo parágrafo opcional.</p>
</div>
```

**Variação com badge:** adicionar um badge colorido antes do conteúdo:

```html
<span style="display: inline-block; background: #cd1543; color: #fff; font-size: 0.7em; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 4px; margin-bottom: 14px;">Nome do Badge</span>
```

### 4. Cards comparativos (lado a lado)

Para contrastar dois conceitos, abordagens ou cenários.

```html
<div style="display: flex; gap: 16px; margin: 1.5em 0; flex-wrap: wrap;">
<div style="flex: 1; min-width: 250px; background: #fff; border: 1px solid #e8ecf0; border-radius: 12px; padding: 24px; border-top: 4px solid #869ec3;">
<h4 style="font-size: 1em; margin-bottom: 10px; color: #000; font-weight: bold;">Título Card A</h4>
<p style="font-size: 0.92em; color: #555; margin-bottom: 0;">Descrição do cenário A.</p>
</div>
<div style="flex: 1; min-width: 250px; background: #fff; border: 1px solid #e8ecf0; border-radius: 12px; padding: 24px; border-top: 4px solid #cd1543;">
<h4 style="font-size: 1em; margin-bottom: 10px; color: #000; font-weight: bold;">Título Card B</h4>
<p style="font-size: 0.92em; color: #555; margin-bottom: 0;">Descrição do cenário B.</p>
</div>
</div>
```

**Cores de borda superior:** usar `#cd1543` (vermelho), `#001844` (azul escuro), `#869ec3` (azul claro) para diferenciar os cards.

### 5. Cards de pilares/conceitos (grade 2x2)

Para apresentar 3-4 conceitos relacionados em formato de grade.

```html
<!-- Primeira linha -->
<div style="display: flex; gap: 16px; margin: 1.5em 0; flex-wrap: wrap;">
<div style="flex: 1; min-width: 220px; background: #fff; border: 1px solid #e8ecf0; border-radius: 12px; padding: 24px; border-top: 4px solid #cd1543;">
<h4 style="font-size: 1em; margin-bottom: 10px; color: #000; font-weight: bold;">Conceito 1</h4>
<p style="font-size: 0.92em; color: #555; margin-bottom: 0;">Descrição.</p>
</div>
<div style="flex: 1; min-width: 220px; background: #fff; border: 1px solid #e8ecf0; border-radius: 12px; padding: 24px; border-top: 4px solid #001844;">
<h4 style="font-size: 1em; margin-bottom: 10px; color: #000; font-weight: bold;">Conceito 2</h4>
<p style="font-size: 0.92em; color: #555; margin-bottom: 0;">Descrição.</p>
</div>
</div>
<!-- Segunda linha -->
<div style="display: flex; gap: 16px; margin: 0 0 1.5em; flex-wrap: wrap;">
<!-- ... mesma estrutura ... -->
</div>
```

### 6. Fluxo visual com etapas numeradas

Para processos sequenciais ou etapas. Usa círculos numerados com setas vermelhas entre eles.

```html
<div style="display: flex; flex-wrap: wrap; margin: 1.5em 0; align-items: stretch; justify-content: center;">
<div style="text-align: center; padding: 16px 8px; background: #f0f4fa; border-radius: 10px; margin: 3px; min-width: 80px; flex: 1;">
<span style="display: inline-block; background: #001844; color: #fff; width: 28px; height: 28px; line-height: 28px; border-radius: 50%; font-size: 0.8em; font-weight: bold; margin-bottom: 6px;">1</span>
<span style="display: block; font-size: 0.78em; font-weight: 600; color: #001844;">Nome da etapa</span>
</div>
<div style="display: flex; align-items: center; color: #cd1543; font-size: 1.2em; font-weight: bold; padding: 0 1px;">→</div>
<!-- repetir para cada etapa -->
</div>
```

### 7. Callout informativo (borda azul com ícone i)

Para dicas, notas importantes ou informações complementares.

```html
<div style="background: #f0f4fa; border-left: 4px solid #869ec3; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 1.5em 0;">
<span style="display: inline-block; background: #869ec3; color: #fff; width: 24px; height: 24px; line-height: 24px; text-align: center; border-radius: 50%; font-size: 0.75em; font-weight: bold; margin-right: 8px;">i</span>
Texto do callout informativo. Pode conter <strong>negrito</strong> e <a href="#">links</a>.
</div>
```

### 8. Callout de alerta (borda vermelha)

Para avisos ou pontos de atenção.

```html
<div style="background: #fff5f7; border-left: 4px solid #cd1543; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 1.5em 0;">
<strong>Atenção:</strong> texto do alerta aqui.
</div>
```

### 9. Blockquote estilizado

Para citações ou frases de destaque.

```html
<div style="padding: 12px 0 12px 20px; margin: 1.2em 0; border-left: 3px solid #869ec3;">
<p style="font-size: 1.05em; font-style: italic; color: #001844; font-weight: 500; margin: 0;">
Texto da citação ou frase de destaque aqui.
</p>
</div>
```

### 10. Box de resumo

Caixa escura com badge "Resumo" que condensa os pontos principais do artigo. Geralmente antes do FAQ.

```html
<div style="background: linear-gradient(135deg, #001844 0%, #0a2a5e 100%); color: #ffffff; padding: 24px 28px; border-radius: 12px; margin: 1.5em 0;">
<span style="display: inline-block; background: #cd1543; color: #fff; font-size: 0.7em; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 4px; margin-bottom: 14px;">Resumo</span>
<p style="color: #ffffff; margin-bottom: 0.6em;">Ponto 1 do resumo com <strong>negrito</strong> nos termos-chave.</p>
<p style="color: #ffffff; margin-bottom: 0.6em;">Ponto 2 do resumo.</p>
<p style="color: #ffffff; margin: 0;">Ponto final (sem margin-bottom).</p>
</div>
```

### 11. FAQ Accordion

Perguntas frequentes com toggle clicável (+/−). Cada pergunta abre/fecha ao clicar.

```html
<h2 id="faq">Perguntas Frequentes</h2>

<div style="margin: 1.5em 0;">
<div style="border: 1px solid #e8ecf0; border-radius: 10px; margin-bottom: 10px; overflow: hidden;">
<div onclick="var a=this.nextElementSibling;var arrow=this.querySelector('.faq-arrow');if(a.style.display==='block'){a.style.display='none';arrow.textContent='+';}else{a.style.display='block';arrow.textContent='−';}" style="background: #fff; padding: 16px 48px 16px 20px; font-weight: 600; color: #001844; cursor: pointer; position: relative;">
Pergunta aqui?
<span class="faq-arrow" style="position: absolute; right: 18px; top: 50%; transform: translateY(-50%); font-size: 1.3em; color: #cd1543; font-weight: 300;">+</span>
</div>
<div style="display: none; padding: 16px 20px; color: #444; line-height: 1.7; border-top: 1px solid #e8ecf0;">
Resposta aqui.
</div>
</div>
<!-- repetir para cada pergunta -->
</div>
```

### 12. CTA Final

Call-to-action no final do artigo com botão vermelho.

```html
<div style="background: linear-gradient(135deg, #001844 0%, #0a2a5e 100%); color: #ffffff; padding: 36px 32px; border-radius: 16px; margin: 2em 0 1em; text-align: center;">
<h3 style="color: #ffffff; font-size: 1.3em; margin-bottom: 10px;">Título do CTA</h3>
<p style="color: rgba(255,255,255,0.85); margin-bottom: 20px;">Texto de apoio do CTA.</p>
<a href="https://www.epiuse.com.br/fale-conosco" style="display: inline-block; background: #cd1543; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: bold; font-size: 1em;">Fale com um especialista</a>
</div>
```

---

## Estrutura Padrão de um Artigo

A ordem típica dos componentes é:

1. **Lead** (sempre)
2. **Parágrafos introdutórios** (1-2 parágrafos de contexto)
3. **Sumário "Neste artigo"** (sempre)
4. **Seções H2** com conteúdo (usar componentes visuais conforme o tema)
5. **Box de Resumo** (sempre, antes do FAQ)
6. **FAQ Accordion** (sempre, 3-5 perguntas)
7. **CTA Final** (sempre)

### Dicas de escolha de componentes

| Tipo de conteúdo | Componente recomendado |
|---|---|
| Lista de perguntas-chave ou checklist | Dark Gradient Box com `<ul>` |
| Dois cenários opostos | Cards comparativos |
| 3-4 pilares ou conceitos | Cards em grade (2x2) |
| Processo sequencial com etapas | Fluxo visual numerado |
| Dica ou nota complementar | Callout informativo (azul) |
| Aviso ou alerta | Callout de alerta (vermelho) |
| Frase de impacto ou citação | Blockquote estilizado |
| Dado estatístico importante | Texto com `<span style="color: #cd1543; font-weight: 600;">` |

---

## Regras Importantes

1. **Somente inline styles** - o HubSpot blog editor não suporta `<style>` tags ou classes CSS externas
2. **Sem `<style>` no `<head>`** - tudo deve estar como atributo `style=""` nos elementos
3. **Sem JavaScript externo** - o FAQ accordion usa `onclick` inline que funciona no HubSpot
4. **Links internos** - usar caminhos relativos: `/nome-da-pagina` (sem domínio completo)
5. **H2 com IDs** - cada seção H2 deve ter um `id` para o sumário funcionar: `<h2 id="nome-secao">`
6. **Responsivo** - os cards usam `flex-wrap: wrap` e `min-width` para funcionar em mobile
7. **Texto em português do Brasil** - todo o conteúdo deve estar em pt-BR

---

## Dados do HubSpot

| Item | Valor |
|---|---|
| Portal ID | 50204216 |
| Blog "Artigo" ID | 216571523122 |
| Blog "Cases de Sucesso" ID | 222053726081 |
| Author EPI-USE ID | 216568147803 |
| Author Rudá Costa ID | 220743808404 |
| CTA padrão | `https://www.epiuse.com.br/fale-conosco` |

---

## Artigos já criados neste template

1. **Os desafios da Reforma Tributária** (`artigo-reforma-tributaria.html`)
   - 6 seções + FAQ com 4 perguntas
   - Componentes: lead, sumário, dark boxes, cards comparativos, fluxo 5 etapas, callouts (info + alerta), blockquote, resumo, FAQ, CTA

2. **IA generativa SAP Joule** (`artigo-ia-generativa-sap-joule.html`)
   - 5 seções + FAQ com 4 perguntas
   - Componentes: lead, sumário, dark boxes (com badge SAP Joule), cards 2x2 (4 pilares), fluxo 5 etapas, cards comparativos, callout info, blockquote, resumo, FAQ, CTA

Ambos os arquivos estão na pasta do projeto e servem como referência completa.

---

## Fluxo de Conversão

Para converter qualquer artigo (docx, texto, PDF) no template:

1. Extrair o conteúdo textual do arquivo fonte
2. Identificar a estrutura: título, seções, pontos-chave, dados
3. Escrever o Lead (resumo impactante em 2-3 frases)
4. Montar o Sumário com as seções identificadas
5. Para cada seção, escolher os componentes visuais mais adequados
6. Montar o Resumo com 3-4 bullet points dos pontos principais
7. Criar 3-5 perguntas de FAQ baseadas no conteúdo
8. Adicionar o CTA final
9. Gerar metadados SEO: título (60 chars), meta description (155 chars), slug, keywords
