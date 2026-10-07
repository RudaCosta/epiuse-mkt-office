#!/usr/bin/env python3
"""
gerar_pptx.py — v2.0 (Módulo 31 · Relatório de Marketing ao vivo)

Monta o PPTX do relatório mensal no padrão do PPT EPI-USE (Brand Guide 2026):
capa e encerramento em Deep Blue, slides de conteúdo brancos, título em
Verdana, vermelho só como acento, rodapé "© Group Elephant" com número da
página, gráficos nativos (editáveis no PowerPoint) nas cores do guia.

Entrada: o JSON de GET /api/relatorio/live (só fontes automáticas).
  • no servidor: --data <arquivo.json> (o Office grava e chama o script)
  • à mão no PC: --mes AAAA-MM --base-url http://localhost:3000
    (autentica com EDITOR_TOKEN do ambiente, pelo header — nunca pela URL)

Template oficial (opcional): --template <arquivo.pptx>. Se tiver os layouts
"Title-slide_Elephant", "Content-slide_white-bg-blank" e "End-slide_Elephant",
os slides usam o mestre oficial; senão o script desenha o padrão do guia.

Regra 7: nada inventado. Fonte sem dado → o slide sai do deck e a fonte
aparece em "Fontes e método" com o status; número parcial vem marcado.

Uso:
  python scripts/relatorio/gerar_pptx.py --data dados.json --output relatorio.pptx
  python scripts/relatorio/gerar_pptx.py --mes 2026-09 [--pdf]
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    from lxml import etree
    from pptx import Presentation
    from pptx.chart.data import CategoryChartData
    from pptx.dml.color import RGBColor
    from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
    from pptx.oxml.ns import qn
    from pptx.util import Emu, Inches, Pt
except ImportError:
    print("ERRO: python-pptx não instalado. Rode: pip install -r scripts/relatorio/requirements.txt")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
LOGO_BRANCO = ROOT / "public/assets/logos-epi-use/epi-use-logo-white.png"
LOGO_COR = ROOT / "public/assets/logos-epi-use/epi-use-logo-rgb.png"
ONEDRIVE_BASE = Path(r"C:/Users/Ruds/OneDrive - EPI USE BRASIL SERVIÇOS EM SISTEMAS LTDA/MARKETING/Reports/Relatorio MKT")

# ── Brand Guide 2026 (vault/00-contexto/DESIGN.md) ────────────────────────────
def rgb(h):
    h = h.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

DEEP = rgb("#001844")      # brand-deep-blue
RED = rgb("#CE181E")       # brand-red — só acento
SVC = rgb("#26476b")       # service-line blue
SLATE = rgb("#355b7e")
ROYAL = rgb("#487494")
STEEL = rgb("#5585a3")
CORN = rgb("#6797b8")
STONE = rgb("#f2f2f2")     # stone gray
TEXT = rgb("#231f20")      # corpo do PPT
MUTED = rgb("#6b6b6b")
WHITE = rgb("#ffffff")
TEAL = rgb("#009193")
AZURE = rgb("#0980bb")
GREEN = rgb("#53bb41")
ORANGE = rgb("#f89921")
SERIE = [DEEP, STEEL, TEAL, AZURE, CORN, SLATE, ORANGE, GREEN]
FONT = "Verdana"           # PPT/Word: Verdana (título 24–32pt · corpo 12–16pt)

W, H = Inches(13.333), Inches(7.5)
MX = Inches(0.6)           # margem lateral
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]
MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
BRT = timezone(timedelta(hours=-3))


# ── Formatação pt-BR ──────────────────────────────────────────────────────────
def n(v, dec=0):
    if v is None:
        return "—"
    s = f"{v:,.{dec}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")

def pct_txt(p):
    if p is None:
        return None
    return f"{'▲' if p >= 0 else '▼'} {n(abs(p), 1)}%"

def mes_curto(m):
    y, mm = m.split("-")
    return f"{MES_CURTO[int(mm) - 1]}/{y[2:]}"

def data_br(iso):
    if not iso:
        return "—"
    try:
        d = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if d.tzinfo:
            d = d.astimezone(BRT)
        return d.strftime("%d/%m/%Y %H:%M") if "T" in str(iso) else d.strftime("%d/%m/%Y")
    except ValueError:
        return str(iso)

def dia_br(dia):
    try:
        y, m, d = str(dia).split("-")
        return f"{d}/{m}"
    except ValueError:
        return str(dia)

def dur_txt(s):
    if s is None:
        return "—"
    return f"{int(s) // 60}min {int(s) % 60:02d}s" if s >= 60 else f"{int(s)}s"


# ── Primitivas de desenho ─────────────────────────────────────────────────────
def set_alpha(shape, alpha):
    """Transparência no preenchimento sólido (alpha 0–100 = opacidade %)."""
    sf = shape.fill._xPr.find(qn("a:solidFill"))
    if sf is None:
        return
    clr = sf[0]
    for a in clr.findall(qn("a:alpha")):
        clr.remove(a)
    el = etree.SubElement(clr, qn("a:alpha"))
    el.set("val", str(int(alpha * 1000)))

def rect(slide, x, y, w, h, cor, forma=MSO_SHAPE.RECTANGLE, raio=None, alpha=None, linha=None):
    s = slide.shapes.add_shape(forma, x, y, w, h)
    s.fill.solid()
    s.fill.fore_color.rgb = cor
    if alpha is not None:
        set_alpha(s, alpha)
    if linha is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = linha
        s.line.width = Pt(0.75)
    s.shadow.inherit = False
    if raio is not None and forma == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = raio
    return s

def texto(slide, x, y, w, h, conteudo, tam=12, cor=TEXT, negrito=False, alinha=PP_ALIGN.LEFT,
          ancora=MSO_ANCHOR.TOP, italico=False, espaco=None):
    """conteudo: str ou lista de parágrafos; parágrafo = str ou lista de (texto, {opções})."""
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)
    tf.vertical_anchor = ancora
    paras = conteudo if isinstance(conteudo, list) else [conteudo]
    for i, par in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = alinha
        if espaco:
            p.space_after = Pt(espaco)
        runs = par if isinstance(par, list) else [(par, {})]
        for txt, op in runs:
            r = p.add_run()
            r.text = str(txt)
            f = r.font
            f.name = FONT
            f.size = Pt(op.get("tam", tam))
            f.bold = op.get("negrito", negrito)
            f.italic = op.get("italico", italico)
            f.color.rgb = op.get("cor", cor)
    return tb

def logo(slide, branco, x, y, altura):
    arq = LOGO_BRANCO if branco else LOGO_COR
    if arq.exists():
        slide.shapes.add_picture(str(arq), x, y, height=altura)


class Deck:
    """Monta os slides no padrão EPI-USE (mestre oficial quando houver template)."""

    def __init__(self, template=None):
        self.oficial = False
        self.prs = None
        if template and Path(template).exists():
            prs = Presentation(str(template))
            nomes = {l.name: l for l in prs.slide_layouts}
            if all(k in nomes for k in ("Title-slide_Elephant", "Content-slide_white-bg-blank", "End-slide_Elephant")):
                # Tira os slides de exemplo do template, fica só o mestre
                lst = prs.slides._sldIdLst
                for sid in list(lst):
                    prs.part.drop_rel(sid.rId)
                    lst.remove(sid)
                self.prs, self.lay, self.oficial = prs, nomes, True
                print("[relatorio] usando o template oficial da marca")
            else:
                print("[relatorio] template sem os layouts esperados — usando o padrão do Brand Guide")
        if self.prs is None:
            self.prs = Presentation()
            self.prs.slide_width, self.prs.slide_height = W, H
            self.lay = {}
        self.W, self.H = self.prs.slide_width, self.prs.slide_height
        self.ano = datetime.now(BRT).year
        self.pagina = 0

    def _blank(self):
        if self.oficial:
            return self.prs.slides.add_slide(self.lay["Content-slide_white-bg-blank"])
        lays = self.prs.slide_layouts
        return self.prs.slides.add_slide(lays[6] if len(lays) > 6 else lays[-1])

    def _rodape(self, s, escuro=False):
        self.pagina += 1
        if self.oficial:
            return  # o mestre oficial já traz rodapé e número
        cor = CORN if escuro else MUTED
        texto(s, MX, self.H - Inches(0.42), Inches(8), Inches(0.25),
              f"{self.pagina}    © {self.ano} Group Elephant Limited. All rights, reserved.", tam=8, cor=cor)

    # ── Capa ────────────────────────────────────────────────────────────────
    def capa(self, titulo, subtitulo, linha3):
        if self.oficial:
            s = self.prs.slides.add_slide(self.lay["Title-slide_Elephant"])
            phs = {p.placeholder_format.idx: p for p in s.placeholders}
            alvo = sorted(phs)
            if alvo:
                phs[alvo[0]].text = titulo
            if len(alvo) > 1:
                phs[alvo[1]].text = f"{subtitulo} · {linha3}"
            self.pagina += 1
            return s
        s = self._blank()
        s.background.fill.solid()
        s.background.fill.fore_color.rgb = DEEP
        # Arcos concêntricos à direita (secundárias do guia, translúcidas)
        for i, (cor, a) in enumerate([(SVC, 55), (SLATE, 40), (ROYAL, 28), (STEEL, 18)]):
            d = Inches(9.6 - i * 1.7)
            rect(s, self.W - d * 0.62, (self.H - d) / 2, d, d, cor, MSO_SHAPE.OVAL, alpha=a)
        rect(s, MX, Inches(3.05), Inches(0.9), Inches(0.07), RED)
        logo(s, True, MX, Inches(0.7), Inches(0.62))
        texto(s, MX, Inches(1.85), Inches(8.5), Inches(0.4), "MONTHLY REPORT · MARKETING", tam=12, cor=CORN, negrito=True)
        texto(s, MX, Inches(3.3), Inches(8.6), Inches(1.0), titulo, tam=40, cor=WHITE, negrito=True)
        texto(s, MX, Inches(4.35), Inches(8.6), Inches(0.6), subtitulo, tam=24, cor=CORN)
        texto(s, MX, Inches(5.15), Inches(8.6), Inches(0.4), linha3, tam=12, cor=WHITE)
        self._rodape(s, escuro=True)
        return s

    # ── Agenda (fundo azul) ─────────────────────────────────────────────────
    def agenda(self, itens):
        s = self._blank()
        s.background.fill.solid()
        s.background.fill.fore_color.rgb = DEEP
        logo(s, True, self.W - MX - Inches(1.45), Inches(0.5), Inches(0.37))
        texto(s, MX, Inches(1.0), Inches(6), Inches(0.8), "Agenda", tam=32, cor=WHITE, negrito=True)
        rect(s, MX, Inches(1.85), Inches(0.7), Inches(0.06), RED)
        col = 0 if len(itens) <= 6 else 1
        for i, item in enumerate(itens):
            c = i // 6 if col else 0
            r = i % 6 if col else i
            x = MX + Inches(6.1) * c
            y = Inches(2.4) + Inches(0.72) * r
            texto(s, x, y, Inches(0.7), Inches(0.5), f"{i + 1:02d}", tam=20, cor=CORN, negrito=True)
            texto(s, x + Inches(0.85), y + Inches(0.04), Inches(5), Inches(0.5), item, tam=16, cor=WHITE)
        self._rodape(s, escuro=True)
        return s

    # ── Slide de conteúdo (branco) ──────────────────────────────────────────
    def conteudo(self, titulo, secao=None, nota=None):
        s = self._blank()
        if not self.oficial:
            logo(s, False, self.W - MX - Inches(1.3), Inches(0.42), Inches(0.31))
        if secao:
            texto(s, MX, Inches(0.38), Inches(9), Inches(0.3), secao.upper(), tam=9, cor=STEEL, negrito=True)
        texto(s, MX, Inches(0.62), Inches(10.8), Inches(0.7), titulo, tam=24, cor=DEEP, negrito=True)
        rect(s, MX, Inches(1.28), Inches(0.6), Inches(0.05), RED)
        if nota:
            texto(s, MX, self.H - Inches(0.78), self.W - 2 * MX, Inches(0.3), nota, tam=8, cor=MUTED, italico=True)
        self._rodape(s)
        return s

    # ── Encerramento ────────────────────────────────────────────────────────
    def fim(self, contato):
        if self.oficial:
            s = self.prs.slides.add_slide(self.lay["End-slide_Elephant"])
            self.pagina += 1
            return s
        s = self._blank()
        s.background.fill.solid()
        s.background.fill.fore_color.rgb = DEEP
        for i, (cor, a) in enumerate([(SVC, 55), (SLATE, 40), (ROYAL, 28)]):
            d = Inches(8.2 - i * 1.9)
            rect(s, -d * 0.35, self.H - d * 0.7, d, d, cor, MSO_SHAPE.OVAL, alpha=a)
        logo(s, True, self.W - MX - Inches(2.3), Inches(0.7), Inches(0.58))
        texto(s, Inches(5.4), Inches(2.6), Inches(7.3), Inches(1), "Perguntas?", tam=40, cor=WHITE, negrito=True)
        rect(s, Inches(5.4), Inches(3.6), Inches(0.9), Inches(0.07), RED)
        texto(s, Inches(5.4), Inches(3.85), Inches(7.3), Inches(0.9), contato, tam=13, cor=CORN)
        texto(s, Inches(5.4), Inches(5.3), Inches(7.3), Inches(0.9),
              "Beyond Corporate Purpose: 1% da receita líquida da EPI-USE vai para projetos ERP — "
              "Elephants, Rhinos & People · erp.ngo", tam=10, cor=WHITE)
        self._rodape(s, escuro=True)
        return s

    def salvar(self, out):
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        self.prs.save(str(out))


# ── Componentes ───────────────────────────────────────────────────────────────
def kpi(s, x, y, w, h, valor, rotulo, delta=None, sub=None, destaque=False):
    rect(s, x, y, w, h, DEEP if destaque else STONE, MSO_SHAPE.ROUNDED_RECTANGLE, raio=0.08)
    cv, cl = (WHITE, CORN) if destaque else (DEEP, MUTED)
    texto(s, x + Inches(0.22), y + Inches(0.18), w - Inches(0.44), Inches(0.3), rotulo, tam=9, cor=cl, negrito=True)
    # Número cabe numa linha: Verdana bold ≈ 0,62 em por caractere
    larg_pt = (w - Inches(0.44)) / 12700
    tam = max(14, min(26, int(larg_pt / (0.66 * max(1, len(str(valor)))))))
    texto(s, x + Inches(0.22), y + Inches(0.48), w - Inches(0.44), Inches(0.6), valor, tam=tam, cor=cv, negrito=True)
    linha = []
    if delta is not None:
        cor = (GREEN if delta >= 0 else RED) if not destaque else (rgb("#a0da96") if delta >= 0 else rgb("#e9979a"))
        linha.append((pct_txt(delta) + "  ", {"cor": cor, "negrito": True}))
    if sub:
        linha.append((sub, {"cor": CORN if destaque else MUTED}))
    if linha:
        texto(s, x + Inches(0.22), y + h - Inches(0.42), w - Inches(0.44), Inches(0.3), [linha], tam=9)

def kpis(s, itens, y=Inches(1.6), h=Inches(1.35), x0=MX, largura=None):
    largura = largura or (W - 2 * MX)
    gap = Inches(0.18)
    w = int((largura - gap * (len(itens) - 1)) / len(itens))
    for i, it in enumerate(itens):
        kpi(s, x0 + (w + gap) * i, y, w, h, **it)

def selo(s, x, y, txt, cor=STEEL):
    """Etiqueta discreta (parcial, posição em, etc.)."""
    w = Inches(0.11 * len(txt) * 0.62 + 0.3)
    rect(s, x, y, w, Inches(0.28), cor, MSO_SHAPE.ROUNDED_RECTANGLE, raio=0.5, alpha=14)
    texto(s, x, y + Inches(0.045), w, Inches(0.22), txt, tam=8, cor=cor, negrito=True, alinha=PP_ALIGN.CENTER)
    return w

def _estilo_grafico(ch, tam=9):
    ch.has_title = False   # série única: sem isso o PowerPoint/LibreOffice mostra o nome da série como título
    ch.font.name = FONT
    ch.font.size = Pt(tam)
    ch.font.color.rgb = TEXT
    ch.has_legend = False

def colunas(s, x, y, w, h, categorias, valores, destaque_idx=None, cor=DEEP, rotulos=True, fmt='#,##0', titulo=None):
    if titulo:
        texto(s, x, y, w, Inches(0.3), titulo, tam=10, cor=DEEP, negrito=True)
        y, h = y + Inches(0.34), h - Inches(0.34)
    cd = CategoryChartData()
    cd.categories = categorias
    cd.add_series("s", valores)
    ch = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, x, y, w, h, cd).chart
    _estilo_grafico(ch)
    pl = ch.plots[0]
    pl.gap_width = 55
    ser = pl.series[0]
    ser.format.fill.solid()
    ser.format.fill.fore_color.rgb = cor
    if destaque_idx is not None and 0 <= destaque_idx < len(valores) and valores[destaque_idx] is not None:
        pt = ser.points[destaque_idx]
        pt.format.fill.solid()
        pt.format.fill.fore_color.rgb = RED
    if rotulos:
        pl.has_data_labels = True
        dl = pl.data_labels
        dl.number_format = fmt
        dl.number_format_is_linked = False
        dl.position = XL_LABEL_POSITION.OUTSIDE_END
        dl.font.size = Pt(8)
        dl.font.color.rgb = MUTED
    va = ch.value_axis
    va.has_major_gridlines = False
    va.visible = False
    ca = ch.category_axis
    ca.tick_labels.font.size = Pt(8)
    ca.tick_labels.font.color.rgb = MUTED
    ca.format.line.color.rgb = rgb("#d9d9d9")
    ca.has_major_gridlines = False
    return ch

def barras_h(s, x, y, w, h, categorias, valores, cores=None, titulo=None, fmt='#,##0'):
    if titulo:
        texto(s, x, y, w, Inches(0.3), titulo, tam=10, cor=DEEP, negrito=True)
        y, h = y + Inches(0.34), h - Inches(0.34)
    cd = CategoryChartData()
    cd.categories = list(reversed(categorias))
    cd.add_series("s", list(reversed(valores)))
    ch = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, x, y, w, h, cd).chart
    _estilo_grafico(ch)
    pl = ch.plots[0]
    pl.gap_width = 45
    ser = pl.series[0]
    ser.format.fill.solid()
    ser.format.fill.fore_color.rgb = STEEL
    if cores:
        for i, c in enumerate(reversed(cores)):
            pt = ser.points[i]
            pt.format.fill.solid()
            pt.format.fill.fore_color.rgb = c
    pl.has_data_labels = True
    pl.data_labels.number_format = fmt
    pl.data_labels.number_format_is_linked = False
    pl.data_labels.position = XL_LABEL_POSITION.OUTSIDE_END
    pl.data_labels.font.size = Pt(9)
    pl.data_labels.font.color.rgb = TEXT
    ch.value_axis.visible = False
    ch.value_axis.has_major_gridlines = False
    ca = ch.category_axis
    ca.tick_labels.font.size = Pt(9)
    ca.format.line.fill.background()
    return ch

def rosca(s, x, y, w, h, categorias, valores, cores, titulo=None):
    if titulo:
        texto(s, x, y, w, Inches(0.3), titulo, tam=10, cor=DEEP, negrito=True)
        y, h = y + Inches(0.34), h - Inches(0.34)
    cd = CategoryChartData()
    cd.categories = categorias
    cd.add_series("s", valores)
    ch = s.shapes.add_chart(XL_CHART_TYPE.DOUGHNUT, x, y, w, h, cd).chart
    _estilo_grafico(ch)
    ch.has_legend = True
    ch.legend.include_in_layout = False
    ch.legend.font.size = Pt(9)
    from pptx.enum.chart import XL_LEGEND_POSITION
    ch.legend.position = XL_LEGEND_POSITION.RIGHT
    ser = ch.plots[0].series[0]
    for i, c in enumerate(cores):
        pt = ser.points[i]
        pt.format.fill.solid()
        pt.format.fill.fore_color.rgb = c
    ch.plots[0].has_data_labels = True
    dl = ch.plots[0].data_labels
    dl.number_format = '0'
    dl.number_format_is_linked = False
    dl.font.size = Pt(9)
    dl.font.color.rgb = WHITE
    dl.font.bold = True
    return ch

def tabela(s, x, y, w, linhas, cabecalho, larguras, alt_linha=Inches(0.36), tam=9):
    rows, cols = len(linhas) + 1, len(cabecalho)
    t = s.shapes.add_table(rows, cols, x, y, w, alt_linha * rows).table
    tot = sum(larguras)
    for i, lw in enumerate(larguras):
        t.columns[i].width = int(w * lw / tot)
    def cel(c, txt, cor_txt, fundo, negrito=False, alinha=PP_ALIGN.LEFT):
        c.fill.solid()
        c.fill.fore_color.rgb = fundo
        c.margin_left = c.margin_right = Inches(0.08)
        c.margin_top = c.margin_bottom = Inches(0.03)
        c.vertical_anchor = MSO_ANCHOR.MIDDLE
        tf = c.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.alignment = alinha
        r = p.add_run()
        r.text = str(txt)
        r.font.name = FONT
        r.font.size = Pt(tam)
        r.font.bold = negrito
        r.font.color.rgb = cor_txt
    for j, hd in enumerate(cabecalho):
        cel(t.cell(0, j), hd, WHITE, DEEP, True, PP_ALIGN.RIGHT if j and j == cols - 1 and cols > 2 else PP_ALIGN.LEFT)
    for i, ln in enumerate(linhas, start=1):
        for j, v in enumerate(ln):
            num = j > 0 and isinstance(v, (int, float))
            cel(t.cell(i, j), n(v) if num else ("—" if v is None else v), TEXT, WHITE if i % 2 else STONE,
                False, PP_ALIGN.RIGHT if num else PP_ALIGN.LEFT)
    return t

def aguardando(s, x, y, w, h, msg):
    rect(s, x, y, w, h, STONE, MSO_SHAPE.ROUNDED_RECTANGLE, raio=0.06)
    texto(s, x + Inches(0.3), y, w - Inches(0.6), h, msg, tam=11, cor=MUTED, ancora=MSO_ANCHOR.MIDDLE, alinha=PP_ALIGN.CENTER)


# ── Slides ────────────────────────────────────────────────────────────────────
def posicao_rd(e, mes):
    ref = e.get("referencia") or {}
    if ref.get("tipo") == "fim-do-mes":
        return f"posição em {dia_br(ref.get('dia'))}"
    if ref.get("tipo") == "agora":
        return "posição de hoje"
    return f"posição em {dia_br(ref.get('dia'))} (o histórico mensal começou depois)"

def slide_resumo(deck, d):
    s = deck.conteudo(f"Resumo de {d['rotulo']}", "Visão geral",
                      "Números de fontes que se atualizam sozinhas. Variações comparam com o mês anterior"
                      + (" no mesmo período (mês em andamento)." if d.get("em_andamento") else "."))
    site, em, ob, v, lk = d["site"], d["email"], d["outbound"], d["voices"], d["links"]
    itens = []
    if site.get("disponivel"):
        itens.append(dict(valor=n(site["usuarios"]), rotulo="VISITANTES NO SITE", destaque=True,
                          delta=(site.get("mom") or {}).get("usuarios"), sub="parcial" if site.get("parcial") else "GA4"))
    if em.get("disponivel") and em.get("base_leads") is not None:
        itens.append(dict(valor=n(em["base_leads"]), rotulo="BASE DE LEADS (RD)",
                          sub=(f"{'+' if (em.get('base_delta') or 0) >= 0 else ''}{n(em['base_delta'])} no mês" if em.get("base_delta") is not None else posicao_rd(em, d["mes"]))))
    if ob.get("disponivel") and ob.get("mes"):
        itens.append(dict(valor=n(ob["mes"]["reunioes"]), rotulo="REUNIÕES · OUTBOUND",
                          sub=f"{n(ob['mes']['respondidos'])} respostas"))
    itens.append(dict(valor=n(v["posts_mes"]), rotulo="POSTS DOS VOICES",
                      delta=_var(v["posts_mes"], v["posts_mes_anterior"]), sub=f"{n(v['voices_que_postaram'])} Voice(s)"))
    itens.append(dict(valor=n(lk["cliques"]), rotulo="CLIQUES RASTREADOS",
                      delta=_var(lk["cliques"], lk["cliques_anterior"]), sub=f"{n(lk['pessoas'])} pessoas"))
    kpis(s, itens[:5])
    texto(s, MX, Inches(3.3), Inches(6), Inches(0.35), "Destaques do mês", tam=13, cor=DEEP, negrito=True)
    linhas = d.get("destaques") or []
    if linhas:
        paras = [[("▪  ", {"cor": RED, "negrito": True}), (x["texto"], {})] for x in linhas[:7]]
        texto(s, MX, Inches(3.75), Inches(12.1), Inches(3), paras, tam=12, espaco=7)
    else:
        aguardando(s, MX, Inches(3.8), Inches(12.1), Inches(1.2), "Sem movimento registrado nas fontes automáticas neste mês.")

def _var(a, b):
    if a is None or not b:
        return None
    return round(100 * (a - b) / b, 1)

def slide_site(deck, d):
    st = d["site"]
    s = deck.conteudo("Site · quem chegou até a EPI-USE", "Google Analytics 4",
                      "Fonte: GA4 Data API, busca automática a cada 12h. Usuários ativos por mês; o mês do relatório em vermelho.")
    if st.get("parcial"):
        selo(s, Inches(10.0), Inches(0.92), "MÊS PARCIAL", ORANGE)
    serie = st.get("serie") or []
    cats = [mes_curto(x["mes"]) for x in serie]
    vals = [x["usuarios"] for x in serie]
    colunas(s, MX, Inches(1.55), Inches(7.4), Inches(3.0), cats, vals, destaque_idx=len(vals) - 1,
            titulo="Visitantes por mês (13 meses)")
    mom = st.get("mom") or {}
    x0, y0 = Inches(8.35), Inches(1.6)
    for i, (rot, val, dl) in enumerate([
        ("VISITANTES", n(st["usuarios"]), mom.get("usuarios")),
        ("PÁGINAS VISTAS", n(st["visualizacoes"]), mom.get("visualizacoes")),
        ("SESSÕES", n(st["sessoes"]), mom.get("sessoes")),
        ("TEMPO MÉDIO", dur_txt(st.get("duracao_s")), mom.get("duracao_s")),
    ]):
        kpi(s, x0 + Inches(2.24) * (i % 2), y0 + Inches(1.5) * (i // 2), Inches(2.1), Inches(1.35), val, rot, delta=dl, destaque=(i == 0))
    tops = [t for t in (st.get("top_pages") or [])][:5]
    if tops:
        linhas = [[(t.get("titulo") or t["path"]).split(" - ")[0][:70] + ("" if t["path"] == "/" else f"  ({t['path'][:38]})"),
                   t.get("visualizacoes")] for t in tops]
        texto(s, MX, Inches(4.75), Inches(6), Inches(0.3), "Páginas mais vistas", tam=10, cor=DEEP, negrito=True)
        tabela(s, MX, Inches(5.08), Inches(12.1), linhas, ["Página", "Visualizações"], [8, 1.4], alt_linha=Inches(0.3), tam=8)

def slide_email(deck, d):
    e = d["email"]
    s = deck.conteudo("E-mail & base de leads", "RD Station Marketing",
                      f"Fonte: RD Station Marketing API, busca diária. Base e funil: {posicao_rd(e, d['mes'])}. "
                      "Estágios = segmentações padrão do RD.")
    etapas = [("Base total", e.get("base_leads"), DEEP), ("Leads", e.get("leads"), SLATE),
              ("Leads qualificados", e.get("leads_qualificados"), STEEL), ("Oportunidades", e.get("oportunidades"), TEAL),
              ("Clientes", e.get("clientes"), GREEN)]
    etapas = [x for x in etapas if x[1] is not None]
    if etapas:
        barras_h(s, MX, Inches(1.55), Inches(6.6), Inches(3.4), [x[0] for x in etapas], [x[1] for x in etapas],
                 cores=[x[2] for x in etapas], titulo="Funil da base (contatos)")
    itens = [dict(valor=n(e.get("enviados_mes")), rotulo="E-MAILS DISPARADOS", destaque=True,
                  sub=f"mês anterior: {n(e.get('enviados_mes_anterior'))}" if e.get("enviados_mes_anterior") is not None else "no mês"),
             dict(valor=n(e.get("workflows_ativos")), rotulo="AUTOMAÇÕES ATIVAS", sub=f"de {n(e.get('workflows_total'))}"),
             dict(valor=n(e.get("lps_publicadas")), rotulo="LANDING PAGES NO AR"),
             dict(valor=(("+" if (e.get("base_delta") or 0) >= 0 else "") + n(e.get("base_delta"))) if e.get("base_delta") is not None else "—",
                  rotulo="VARIAÇÃO DA BASE", sub="vs fim do mês anterior" if e.get("base_delta") is not None else "histórico começando")]
    for i, it in enumerate(itens):
        kpi(s, Inches(7.55) + Inches(2.65) * (i % 2), Inches(1.6) + Inches(1.5) * (i // 2), Inches(2.5), Inches(1.35), **it)
    serie = [x for x in (e.get("enviados_serie") or [])]
    if any(x["n"] is not None for x in serie):
        colunas(s, Inches(7.55), Inches(4.75), Inches(5.15), Inches(1.85), [mes_curto(x["mes"]) for x in serie],
                [x["n"] for x in serie], destaque_idx=len(serie) - 1, cor=STEEL, titulo="E-mails disparados por mês")

def slide_outbound(deck, d):
    o = d["outbound"]
    m = o.get("mes")
    nota = "Fonte: Apollo API, busca automática a cada 6h. Mês = diferença entre o fim do mês e o fim do mês anterior."
    if m and m.get("desde"):
        nota += f" Histórico diário começou em {dia_br(m['desde'])}: o mês está contado a partir dessa data."
    s = deck.conteudo("Outbound · prospecção ativa", "Apollo", nota)
    if m:
        kpis(s, [
            dict(valor=n(m["entregues"]), rotulo="E-MAILS ENTREGUES", destaque=True),
            dict(valor=n(m["abertos"]), rotulo="ABERTOS", sub=f"{n(m.get('taxa_abertura'), 1)}% de abertura" if m.get("taxa_abertura") is not None else None),
            dict(valor=n(m["respondidos"]), rotulo="RESPOSTAS", sub=f"{n(m.get('taxa_resposta'), 1)}% de resposta" if m.get("taxa_resposta") is not None else None),
            dict(valor=n(m["reunioes"]), rotulo="REUNIÕES"),
        ])
    else:
        aguardando(s, MX, Inches(1.6), Inches(12.1), Inches(1.35),
                   "O histórico diário do Apollo ainda não cobre este mês — abaixo, a posição atual da operação.")
    kpis(s, [
        dict(valor=n(o.get("contatos")), rotulo="CONTATOS NA BASE"),
        dict(valor=n(o.get("contas")), rotulo="EMPRESAS"),
        dict(valor=f"{n(o.get('sequencias_ativas'))} / {n(o.get('sequencias_total'))}", rotulo="SEQUÊNCIAS ATIVAS"),
    ], y=Inches(3.15), h=Inches(1.1), largura=Inches(5.6))
    tops = o.get("top_sequencias") or []
    if tops:
        texto(s, Inches(6.5), Inches(3.15), Inches(6), Inches(0.3), "Sequências (acumulado)", tam=10, cor=DEEP, negrito=True)
        tabela(s, Inches(6.5), Inches(3.48), Inches(6.2),
               [[t["nome"][:42] + ("" if t.get("ativa") else " (pausada)"), t.get("entregues"), t.get("respondidos"), t.get("reunioes")] for t in tops[:5]],
               ["Sequência", "Entregues", "Respostas", "Reuniões"], [5, 1.3, 1.3, 1.2], alt_linha=Inches(0.32), tam=8)
    dias = o.get("dias") or []
    if len(dias) >= 3:
        colunas(s, MX, Inches(4.45), Inches(5.6), Inches(2.2), [dia_br(x["dia"]) for x in dias], [x["entregues"] for x in dias],
                cor=STEEL, rotulos=False, titulo="Entregues por dia")

def slide_voices(deck, d):
    v, lk = d["voices"], d["links"]
    s = deck.conteudo("EPI-USE Voices & links rastreados", "Marca empregadora · alcance",
                      "Fontes ao vivo no Office: pautas e posts dos Voices (Módulo 20) e cliques reais nos links rastreados, sem robôs (Módulo 18)."
                      + (" Mês em andamento: comparação com o mesmo período do mês anterior." if d.get("em_andamento") else ""))
    kpis(s, [
        dict(valor=n(v["posts_mes"]), rotulo="POSTS PUBLICADOS", destaque=True, delta=_var(v["posts_mes"], v["posts_mes_anterior"]),
             sub=f"{n(v['voices_que_postaram'])} de {n(v['roster'])} Voices"),
        dict(valor=n(v["pautas_publicadas"]), rotulo="PAUTAS PUBLICADAS", sub=f"{n(v['pautas_criadas'])} criadas no mês"),
        dict(valor=n(lk["cliques"]), rotulo="CLIQUES NOS LINKS", delta=_var(lk["cliques"], lk["cliques_anterior"]), sub=f"{n(lk['pessoas'])} pessoas"),
        dict(valor=n(v["inscricoes_mes"]), rotulo="INSCRIÇÕES · SEJA VOICE", sub=f"mês anterior: {n(v['inscricoes_mes_anterior'])}"),
    ])
    p6 = v.get("posts_6m") or []
    colunas(s, MX, Inches(3.2), Inches(4.1), Inches(3.3), [mes_curto(x["mes"]) for x in p6], [x["n"] for x in p6],
            destaque_idx=len(p6) - 1, titulo="Posts dos Voices por mês")
    pd = [x for x in (lk.get("por_dia") or []) if not x.get("futuro")]
    if pd:
        colunas(s, Inches(4.95), Inches(3.2), Inches(4.4), Inches(3.3), [x["dia"][8:] for x in pd], [x["n"] for x in pd],
                cor=STEEL, rotulos=False, titulo="Cliques por dia")
    orig = lk.get("por_origem") or []
    if orig:
        barras_h(s, Inches(9.55), Inches(3.2), Inches(3.2), Inches(3.3), [x["nome"][:18] for x in orig[:5]], [x["n"] for x in orig[:5]],
                 titulo="Cliques por origem")
    elif v.get("por_voice"):
        barras_h(s, Inches(9.55), Inches(3.2), Inches(3.2), Inches(3.3), [x["nome"][:18] for x in v["por_voice"][:5]],
                 [x["posts"] for x in v["por_voice"][:5]], titulo="Posts por Voice")

def slide_editorial(deck, d):
    e = d["editorial"]
    s = deck.conteudo("Conteúdo · calendário editorial", "Planilha de marketing",
                      "Fonte: planilha editorial lida automaticamente da nuvem a cada 6h (Microsoft Graph).")
    st = e.get("por_status") or []
    kpis(s, [dict(valor=n(e.get("total")), rotulo="POSTS NO CALENDÁRIO", destaque=True)] +
         [dict(valor=n(x["n"]), rotulo=x["nome"].upper()[:22]) for x in st[:3]], largura=Inches(12.1))
    fm = e.get("por_formato") or []
    if fm:
        barras_h(s, MX, Inches(3.2), Inches(4.4), Inches(3.3), [x["nome"][:20] for x in fm], [x["n"] for x in fm], titulo="Por formato")
    itens = e.get("itens") or []
    if itens:
        texto(s, Inches(5.3), Inches(3.2), Inches(7), Inches(0.3), "No calendário", tam=10, cor=DEEP, negrito=True)
        tabela(s, Inches(5.3), Inches(3.53), Inches(7.4),
               [[dia_br(x["data"]), (x.get("titulo") or "")[:58], x.get("formato") or "", x.get("status") or ""] for x in itens[:8]],
               ["Data", "Pauta", "Formato", "Status"], [0.8, 4.6, 1.3, 1.2], alt_linha=Inches(0.3), tam=8)

STATUS_CASE = {"case-publicado": ("Publicado", GREEN), "em-edicao": ("Em edição", AZURE), "negociacao": ("Negociação", ORANGE),
               "live": ("Live", DEEP), "onboarding": ("Onboarding", STEEL), "declinado": ("Declinado", rgb("#9a9a9a"))}

def slide_cases(deck, d):
    c = d["cases"]
    s = deck.conteudo("Cases · prova social", "Customer Success",
                      f"Fonte: base de Customer Success (sync diário 07:00). Posição em {data_br(c.get('atualizado_em'))}.")
    kpis(s, [
        dict(valor=n(c.get("total")), rotulo="CLIENTES NA BASE", destaque=True),
        dict(valor=n(c.get("publicaveis")), rotulo="CASES PUBLICÁVEIS"),
        dict(valor=n(c.get("nps_medio")) if c.get("nps_medio") is not None else "—", rotulo="NPS MÉDIO", sub=f"{n(c.get('nps_n'))} respostas"),
    ], largura=Inches(12.1))
    ps = c.get("por_status") or {}
    if ps:
        cats = list(ps.keys())
        rosca(s, MX, Inches(3.2), Inches(5.6), Inches(3.3), [STATUS_CASE.get(k, (k, STEEL))[0] for k in cats],
              [ps[k] for k in cats], [STATUS_CASE.get(k, (k, SERIE[i % len(SERIE)]))[1] for i, k in enumerate(cats)], titulo="Por status")
    lob = c.get("por_lob") or []
    if lob:
        barras_h(s, Inches(6.6), Inches(3.2), Inches(6.1), Inches(3.3), [x["lob"][:24] for x in lob[:6]], [x["n"] for x in lob[:6]], titulo="Por linha de negócio")

ST_TXT = {"ok": "Atualizando", "parado": "Parado", "erro": "Com erro", "sem-credencial": "Sem credencial",
          "sem-dado": "Sem dado", "buscando": "Buscando", "desligado": "Desligado", "aguardando": "Aguardando"}

def slide_fontes(deck, d):
    f = d["fontes"]
    s = deck.conteudo("Fontes e método", "Transparência dos números",
                      f"Gerado em {data_br(d.get('gerado_em'))}{' por ' + d['gerado_por'] if d.get('gerado_por') else ''}. "
                      "Nenhum número deste relatório é digitado à mão ou estimado.")
    texto(s, MX, Inches(1.55), Inches(7), Inches(0.3), "Dentro do relatório (atualização automática)", tam=11, cor=DEEP, negrito=True)
    tabela(s, MX, Inches(1.9), Inches(7.3),
           [[x["nome"], x["cadencia"], ST_TXT.get(x["status"], x["status"]), data_br(x.get("atualizado_em"))] for x in f["dentro"]],
           ["Fonte", "Cadência", "Status", "Última atualização"], [3.2, 2.6, 1.4, 1.9], alt_linha=Inches(0.42), tam=8)
    texto(s, Inches(8.25), Inches(1.55), Inches(4.5), Inches(0.3), "Fora (sem atualização automática)", tam=11, cor=DEEP, negrito=True)
    paras = []
    for x in f["fora"]:
        paras.append([(x["nome"], {"negrito": True, "cor": DEEP})])
        paras.append([(x["motivo"] + (f"  ·  office.epiuse.com.br{x['href']}" if x.get("href") else ""), {"cor": MUTED, "tam": 9})])
    texto(s, Inches(8.25), Inches(1.95), Inches(4.45), Inches(4.6), paras, tam=10, espaco=3)


# ── Montagem ──────────────────────────────────────────────────────────────────
def montar(d, template=None):
    deck = Deck(template)
    mes = d["mes"]
    y, m = mes.split("-")
    titulo_mes = f"{MESES[int(m) - 1].capitalize()} de {y}"
    deck.capa("Relatório de Marketing", titulo_mes + (" · parcial" if d.get("em_andamento") else ""),
              "EPI-USE Brasil · Marketing & RevOps")
    planos = [("Resumo do mês", slide_resumo, True),
              ("Site · Google Analytics 4", slide_site, d["site"].get("disponivel")),
              ("E-mail & base · RD Station", slide_email, d["email"].get("disponivel")),
              ("Outbound · Apollo", slide_outbound, d["outbound"].get("disponivel")),
              ("EPI-USE Voices & links", slide_voices, True),
              ("Conteúdo · calendário editorial", slide_editorial, d["editorial"].get("disponivel")),
              ("Cases", slide_cases, d["cases"].get("disponivel")),
              ("Fontes e método", slide_fontes, True)]
    ativos = [p for p in planos if p[2]]
    deck.agenda([p[0] for p in ativos])
    for _, fn, _ in ativos:
        fn(deck, d)
    deck.fim("Marketing & RevOps · EPI-USE Brasil\nRelatório gerado pelo EPI-USE Office · office.epiuse.com.br/relatorio")
    return deck


def fetch_live(mes, base_url):
    url = f"{base_url.rstrip('/')}/api/relatorio/live?mes={mes}"
    req = urllib.request.Request(url)
    token = os.environ.get("OFFICE_EDITOR_TOKEN") or os.environ.get("EDITOR_TOKEN")
    if token:
        req.add_header("X-Editor-Token", token)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"ERRO: não consegui ler {url} ({e}). O Office está rodando?")
        sys.exit(1)


def para_pdf(pptx):
    bins = [os.environ.get("SOFFICE_BIN"), shutil.which("soffice"), shutil.which("libreoffice"),
            "C:/Program Files/LibreOffice/program/soffice.exe"]
    b = next((x for x in bins if x and Path(x).exists()), None)
    if not b:
        print("[relatorio] LibreOffice não encontrado — PDF não gerado")
        return None
    subprocess.run([b, "--headless", "--convert-to", "pdf", "--outdir", str(Path(pptx).parent), str(pptx)], check=True, timeout=180)
    pdf = Path(pptx).with_suffix(".pdf")
    if not pdf.exists():
        print("[relatorio] LibreOffice não gerou o PDF (falta o módulo Impress?)")
        return None
    return pdf


def main():
    ap = argparse.ArgumentParser(description="Relatório de Marketing EPI-USE (PPTX no padrão da marca)")
    ap.add_argument("--data", help="JSON de /api/relatorio/live já salvo")
    ap.add_argument("--mes", help="AAAA-MM (lê do Office em --base-url)")
    ap.add_argument("--base-url", default="http://localhost:3000")
    ap.add_argument("--output", help="Caminho do .pptx")
    ap.add_argument("--template", help="Template oficial .pptx (opcional)")
    ap.add_argument("--pdf", action="store_true", help="Também gera o PDF (LibreOffice)")
    a = ap.parse_args()

    if a.data:
        d = json.loads(Path(a.data).read_text(encoding="utf-8"))
    elif a.mes:
        d = fetch_live(a.mes, a.base_url)
    else:
        ap.error("informe --data ou --mes")
    if not d.get("success"):
        print(f"ERRO: resposta sem sucesso: {d.get('error')}")
        sys.exit(1)

    out = a.output
    if not out:
        y, m = d["mes"].split("-")
        nome = f"{m} - EPI-USE _ Marketing {y} - {MESES[int(m) - 1].capitalize()} (auto).pptx"
        out = (ONEDRIVE_BASE / y / nome) if ONEDRIVE_BASE.exists() else (Path.cwd() / nome)
    deck = montar(d, a.template)
    deck.salvar(out)
    print(f"[relatorio] {deck.pagina} slides → {out}")
    if a.pdf:
        p = para_pdf(out)
        if p:
            print(f"[relatorio] PDF → {p}")


if __name__ == "__main__":
    main()
