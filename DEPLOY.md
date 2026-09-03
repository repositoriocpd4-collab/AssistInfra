# Agenda Integrada — Deploy no Render

## Arquitetura

```
GitHub Repository
       │   (git push → deploy automático)
       ▼
  Render Web Service       ← FastAPI + uvicorn (Python 3.11)
       │
       ▼
  Supabase PostgreSQL      ← Banco de dados (já na nuvem)
```

---

## Arquivos de deploy criados

| Arquivo       | Finalidade |
|---------------|------------|
| `render.yaml` | Configuração declarativa do serviço (build, start, env vars) |
| `Procfile`    | Comando de start (compatível com Render, Railway e Heroku) |
| `runtime.txt` | Versão do Python (`python-3.11.9`) |

---

## Passo a passo

### 1. Subir o código para o GitHub

```bash
git add render.yaml Procfile runtime.txt app.py
git commit -m "chore: adiciona arquivos de deploy para Render"
git push origin main
```

> ⚠️ O `.env` está no `.gitignore` e **não vai para o GitHub**. Credenciais são definidas no painel do Render.

---

### 2. Criar o serviço no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **New → Web Service**
3. Conecte a conta do GitHub e selecione o repositório
4. O Render detecta o `render.yaml` e preenche tudo automaticamente:
   - **Runtime:** Python
   - **Build:** `pip install -r requirements.txt`
   - **Start:** `uvicorn app:app --host 0.0.0.0 --port $PORT`

---

### 3. Configurar variáveis de ambiente

No painel: **Environment → Add Environment Variable**

| Variável                   | Onde copiar                  |
|----------------------------|------------------------------|
| `SUPABASE_DB_HOST`         | `.env` local                 |
| `SUPABASE_DB_PORT`         | `.env` local                 |
| `SUPABASE_DB_NAME`         | `.env` local                 |
| `SUPABASE_DB_USER`         | `.env` local                 |
| `SUPABASE_DB_PASSWORD`     | `.env` local                 |
| `SUPABASE_URL`             | `.env` local                 |
| `SUPABASE_PUBLISHABLE_KEY` | `.env` local                 |
| `SUPABASE_SECRET_KEY`      | `.env` local                 |
| `AGENDA_SECRET`            | Gere uma string aleatória    |

> Dica: no Render, para `AGENDA_SECRET`, clique em **"Generate"** para criar uma chave segura automaticamente.

---

### 4. Deploy

Clique em **"Create Web Service"**. O Render instala as dependências e sobe o servidor.

Ao terminar, a URL será algo como:
```
https://assistinfra-devassist.onrender.com
```

---

### 5. Deploys futuros (automáticos)

```bash
git add .
git commit -m "feat: descrição da mudança"
git push
```

O Render detecta o push e faz o redeploy automaticamente.

---

## Observações importantes

### Uploads de arquivos
O disco do Render no **plano gratuito é efêmero** — arquivos enviados (pasta `uploads/`) são perdidos a cada deploy. Para resolver:
- Use o **Supabase Storage** (já integrado ao projeto)
- Ou um bucket S3/Cloudflare R2

### Plano gratuito — "cold start"
O serviço "dorme" após 15 min de inatividade. A próxima requisição leva ~30s para acordar.  
Para evitar isso, use o plano **Starter** (US$ 7/mês) ou configure um cron de ping.

### Deploy alternativo: Railway
Se preferir o Railway, o `Procfile` já é compatível. Apenas crie o projeto em [railway.app](https://railway.app), conecte o repositório e configure as variáveis de ambiente.
