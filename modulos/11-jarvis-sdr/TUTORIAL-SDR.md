# 🤖 JARVIS — Guia rápido do SDR

> **O que é:** um copiloto que escuta sua call e sugere o que falar, em tempo real.
> **Onde:** `office.epiuse.com.br/jarvis` — **use o Chrome**.
> **Regra número 1:** ele sugere, **você decide**. Nada aqui vai pro cliente sem passar por você.

---

## 1 · Antes da call (2 min)

1. Abre o JARVIS **no Chrome**.
2. Preenche **só Prospect e Empresa**.
   > LOB, cargo, indústria e estágio **ele descobre da conversa** — aparecem como etiquetas no topo.
3. Clica **🧭 Pré-call brief** → sai a **abertura**, dores prováveis, gatilho de urgência, perguntas-chave e prova social.
4. Dúvida técnica de produto? **🔬 Pesquisar produto** (ex: *"SAP DRC Reforma Tributária"*).

---

## 2 · Ligando a escuta — ache o seu caso

### 🎧 Caso A — ligação no 3CX (ou qualquer softphone, de fone) ← mais comum
1. **🎙️ Ativar mic** → permite o microfone. Isso capta **você**.
2. No **seletor ao lado do botão**, escolhe de onde vem a **voz do cliente**:
   - **🎚️ Mixagem estéreo / Stereo Mix** (ou cabo virtual **VB-Cable**) — **recomendado no 3CX**. O JARVIS tenta achar sozinho e já deixa selecionado.
   - Ou **🔊 Áudio do sistema** → escolhe **"Tela inteira"** e **marca "Compartilhar áudio do sistema"**.
     > ⚠️ **Sem marcar o áudio, não vem som.** É o erro mais comum.
3. Clica **🎧 Áudio da call**. Na primeira vez ele **baixa o modelo** (~100 MB, uma vez só). Espera o status ficar **verde**.

✅ Pronto: **seu mic = você (SDR)** e o **áudio da call = o cliente**. Você não marca nada.

> 💡 **Não aparece "Mixagem estéreo"?** Windows: botão direito no ícone de som → *Configurações de som* → *Mais opções* → aba **Gravação** → botão direito no vazio → **Mostrar dispositivos desativados** → habilita **Mixagem estéreo**. Se a placa não tiver, instala o **VB-Cable** (grátis).

### 🔊 Caso B — viva-voz / reunião presencial
1. Só **🎙️ Ativar mic**.
2. Ele separa as falas em **Voz 1** e **Voz 2** pelas pausas.
3. Em **"Quem é cada voz?"**, marca **1 vez** quem é SDR e quem é Cliente.
4. Trocou as vozes no meio? **↔️ trocar voz**.

> 💡 Sem viva-voz? Digita a fala do cliente no campo de texto — funciona igual.

---

## 3 · Durante a call

**Fala normal.** As sugestões aparecem sozinhas à direita quando o cliente fala.

| Card | Como usar |
|---|---|
| ❓ **Próxima pergunta** | A pergunta de descoberta pra fazer agora |
| 💬 **Fala sugerida** | O que dizer — **adapta pra tua voz** |
| 🛡️ **Contorno de objeção** | Aparece quando o cliente reclama de preço/prazo/etc |
| ✅ **Próximo passo** | Como fechar a call com compromisso e data |
| 📎 **Conteúdos pra enviar** | Links **reais** do nosso site — pode mandar |

**Medidores:**
- **Você fala %** → passou de ~50%? **Cala a boca e pergunta.** Quem fala mais é quem compra.
- **Temperatura** → quão quente está a oportunidade.
- **Perguntas** → quantas você fez.

Travou no meio? **⚡ Pedir sugestão agora**.

---

## 4 · Acabou a call

Só clica **⏸️ Pausar mic**.

- **Não existe botão de salvar** — ele salva sozinho e extrai as dores que o cliente falou. Vai aparecer *"💾 call salva"*.
- Essas dores viram inteligência: o JARVIS acerta mais na próxima call, e o Marketing usa pra pautar conteúdo (**📊 Dores de campo**).

---

## ⚠️ Regras que não se quebram

- A fala sugerida é **roteiro, não script** — não lê robotizado.
- **Nunca** cite concorrente pelo nome.
- **Nunca** cite cliente nosso sem aprovação → fale *"um grande grupo do agro"*.
- É IA: **confere antes de prometer** prazo, número ou escopo.

---

## 🔧 Se der problema

| O que aparece | O que fazer |
|---|---|
| *"Sem faixa de áudio"* | Escolhe **"Tela inteira"** e marca **"Compartilhar áudio do sistema"**. Ou troca pro modo **🎚️ dispositivo** (Mixagem estéreo), que não usa compartilhamento. |
| **Ouve você, mas não o cliente** | A fonte está errada. No 3CX use **Mixagem estéreo / VB-Cable**, não o microfone. |
| **Não aparece "Mixagem estéreo"** | Habilita em *Configurações de som → Gravação → Mostrar dispositivos desativados*, ou instala o **VB-Cable**. |
| *"use o Chrome"* | Abriu no Safari/Firefox. Troca pro Chrome. |
| **No Mac** | O Chrome não captura áudio do sistema; só o modo **dispositivo** com cabo virtual (BlackHole). |
| *"Falha ao carregar o modelo"* | Rede bloqueando o download. Chama o Rudá. |
| Não ouve nada | Confirma que o **🎧 Áudio da call** está ligado (botão fica vermelho: "Parar captura"). |

---

*Dúvida ou algo estranho? Manda print do status pro Rudá. Este guia também está dentro da tela, em **"❓ Como usar o JARVIS"**.*
