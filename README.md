# Imóveis Mônica Poplawski — Casa Contemporânea (Ref. MP-0126)

Landing page de apresentação de um imóvel de alto padrão (Genesis 1, Santana de Parnaíba).
Hero com **vídeo controlado pelo scroll** (scroll-scrubbing) e informações da casa
reveladas em sequência conforme o usuário rola a página.

## Rodar localmente

Servidor estático com suporte a **HTTP range requests** (necessário para o scrubbing do
vídeo), sem nenhuma dependência externa:

```bash
node dev-server.js
# abre em http://localhost:5173
```

## Deploy (Vercel)

Site 100% estático, **sem etapa de build**. Basta importar o repositório no Vercel:

- Framework Preset: **Other**
- Build Command: *(vazio)*
- Output Directory: **`.`** (raiz)

O `vercel.json` já define cache longo para o vídeo. O Vercel serve arquivos estáticos com
suporte nativo a range requests, então o scrubbing funciona igual ao ambiente local.

## Stack

- HTML / CSS / JS puro (sem framework)
- Fontes: **Outfit** + **Sora** (Google Fonts)
- Vídeo do hero: `0718-web.mp4` (1600×900, reencodado com keyframe em todo frame para
  scrubbing fluido)

## Estrutura

```
index.html            # página
assets/css/styles.css # design system (tokens da marca Poplawski)
assets/js/hero.js     # scroll-scrubbing + informações sequenciais
assets/img/           # logos
0718-web.mp4          # vídeo otimizado do hero
dev-server.js         # servidor estático local (dev) — ignorado no deploy
vercel.json           # config de deploy
```

## Ajustes finos (assets/js/hero.js e assets/css/styles.css)

- `--hero-track` (CSS): velocidade do scroll (maior = mais lento).
- `SCRUB_EASE` (JS): suavidade/inércia do vídeo em relação ao scroll.
- `REVEAL_START` / `REVEAL_END` / `REVEAL_FADE` (JS): janela e transição das 5 informações.
