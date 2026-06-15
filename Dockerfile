# EPI-USE Office — Node + Python (python-pptx) para geração do relatório PPTX no Railway.
# Antes: Railway usava Nixpacks (só Node) -> `python: not found` ao gerar o PPTX em prod.
# Agora: imagem traz Node 20 + Python3 + python-pptx, então qualquer usuário gera o relatório
# sem depender da máquina local.
FROM node:20-bookworm-slim

# Python + toolchain (build-essential cobre compilação eventual do better-sqlite3).
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip build-essential ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala deps Node primeiro (camada cacheável). NODE_ENV nao setado aqui de proposito:
# xlsx esta em devDependencies mas e usado em runtime — precisa entrar no install.
COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Codigo da app (node_modules/.git/.env excluidos via .dockerignore).
COPY . .

# python-pptx (+ lxml/Pillow/XlsxWriter transitivos) para scripts/relatorio/gerar_pptx.py.
RUN pip3 install --break-system-packages --no-cache-dir -r scripts/relatorio/requirements.txt

# server.js le PYTHON_BIN para escolher o interpretador.
ENV PYTHON_BIN=python3

EXPOSE 3000
CMD ["node", "server.js"]
