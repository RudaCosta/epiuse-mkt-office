# Decisões — Banco de Horas

- **Sem aprovação nem validade** (Bruna, 03/set/2026): é controle interno de confiança; a "validação" é o aviso ao Rudá a cada +8h.
- **Visibilidade:** cada um vê o próprio saldo; só o super admin (por e-mail) vê o time. O front recebe `admin` do servidor; antes comparava `role === 'head'` e divergia do backend.
- **Categoria na coluna `project`** (já existia na v1) em vez de migrar o schema.
- **Apagar sem confirmação, com "Desfazer"** (v2): o desfazer recria o registro com os mesmos dados.
- **Recusar texto com U+FFFD**: se o motivo chegar fora de UTF-8, o servidor devolve erro em vez de gravar "�".
- Numeração: o código da v1 dizia "Módulo 23", mas 23 é a Visão Única do Funil. O Banco de Horas passou a ser o **32**.
