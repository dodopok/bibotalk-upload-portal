# Bibotalk · Portal de Episódios

Portal único para publicar episódios do podcast: sobe o `.mp3` pro FTP, cria/edita o post no WordPress com os campos do PowerPress (enclosure, artwork, duração), featured image, categorias e tags — e acompanha o que ainda falta subir de vídeo no Spotify.

**Stack:** Nuxt 3 + Vue 3, login Google (allowlist de e-mails), WordPress REST API, FTP (`basic-ftp`), Docker pronto para Railway.

## Como funciona

1. Você faz login com Google (apenas e-mails autorizados; o 2FA é o da própria conta Google).
2. A lista de episódios vem direto do WordPress (publicados, agendados e rascunhos) — o WP continua sendo a fonte da verdade, nada é duplicado em banco próprio.
3. Ao criar/editar um episódio:
   - o `.mp3` é enviado pro **mesmo servidor FTP de hoje** (com barra de progresso); o portal calcula tamanho e duração automaticamente;
   - a featured image e o artwork sobem pra biblioteca de mídia do WP;
   - o post é criado com título, descrição, categorias, tags, status (rascunho / publicar / agendar) e o **enclosure do PowerPress** no formato exato que o plugin espera — o feed atualiza e o Spotify puxa o episódio;
   - o episódio pode ficar marcado como **"vídeo pendente"**, com botão que abre o Spotify for Creators (essa etapa não tem API pública, então continua manual, mas rastreada).

## Setup

### 1. Plugin auxiliar no WordPress (obrigatório)

O PowerPress não expõe seus campos na REST API. Copie [`wordpress-plugin/bibotalk-portal-helper.php`](wordpress-plugin/bibotalk-portal-helper.php) para `wp-content/plugins/` no servidor e **ative o plugin** no painel. Ele:

- expõe/grava o enclosure (`mp3`, tamanho, duração, artwork) no post meta `enclosure`, formato nativo do PowerPress;
- registra o meta `bibotalk_video_pending` (o checklist de vídeo do Spotify).

### 2. Application Password no WordPress

No painel: **Usuários → Perfil → Application Passwords** → crie uma senha chamada `bibotalk-portal`. Use o nome de usuário e essa senha em `NUXT_WP_USER` / `NUXT_WP_APP_PASSWORD`. Requer WP 5.6+ e HTTPS.

### 3. OAuth do Google

No [Google Cloud Console](https://console.cloud.google.com/apis/credentials): crie um **OAuth Client ID** (tipo Web). Em *Authorized redirect URIs* adicione:

- `http://localhost:3000/auth/google` (dev)
- `https://SEU-DOMINIO/auth/google` (produção)

### 4. Variáveis de ambiente

```bash
cp .env.example .env
# preencha tudo — cada variável está comentada no arquivo
```

### 5. Rodar

```bash
npm install
npm run dev        # http://localhost:3000
```

## Deploy na Railway

1. Crie um serviço a partir deste repositório — a Railway detecta o `Dockerfile` automaticamente.
2. Configure todas as variáveis do `.env.example` no painel da Railway (gere um `NUXT_SESSION_PASSWORD` forte: `openssl rand -base64 32`).
3. Aponte o redirect URI do Google pro domínio gerado/custom.

> **Uploads grandes:** o mp3 passa pelo servidor Node antes de ir pro FTP, então o serviço precisa de RAM suficiente pro tamanho do arquivo (um episódio de ~200 MB usa ~200 MB de RAM durante o upload).

## Estrutura

```
components/         EpisodeForm, AudioUpload (FTP), ImageUpload (WP media), TagInput…
pages/              index (lista), episodes/new, episodes/[id] (edição), login
server/api/         episodes (CRUD via WP REST), upload/audio (FTP), upload/image, taxonomies
server/routes/auth/ callback do Google OAuth (allowlist de e-mails)
server/utils/wp.ts  cliente WP REST + montagem do payload do PowerPress
wordpress-plugin/   plugin auxiliar (instalar no WP)
```
