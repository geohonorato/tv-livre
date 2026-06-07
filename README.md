# 📺 TV Livre

Player IPTV automático com canais brasileiros atualizados via GitHub Actions.

## Como funciona

1. Uma **GitHub Action** roda 2x ao dia
2. Varre os sites de streaming e extrai os links dos canais
3. Atualiza o `canais.json`
4. Faz deploy automático no **GitHub Pages**
5. O `index.html` carrega o JSON e monta o player

## Setup (uma vez)

1. Crie um repositório no GitHub (ex: `tv-livre`)
2. Habilite **GitHub Pages** em Settings → Pages (branch: `gh-pages` ou a padrão)
3. No repositório, vá em **Settings → Actions → General**: marque "Read and write permissions"
4. Faça push dos arquivos:
```bash
cd E:/Códigos/hermes-iptv
git init
git add .
git commit -m "Primeiro commit"
git remote add origin https://github.com/SEU_USUARIO/tv-livre.git
git branch -M main
git push -u origin main
```

Depois é só acessar: `https://SEU_USUARIO.github.io/tv-livre/`

## Estrutura

```
├── index.html             # Player (carrega canais.json)
├── canais.json            # Lista de canais (atualizada automaticamente)
├── scripts/
│   └── atualizar.sh       # Script de varredura
└── .github/workflows/
    └── atualizar.yml      # GitHub Action (roda 2x/dia)
```

## Manual

- **Buscar canal** — campo de texto no topo da sidebar
- **Play/Pause** — botão ou clique no vídeo
- **Mudo** — alterna áudio
- **Tela cheia** — expande o player

> Use com **uBlock Origin** para bloquear anúncios nos iframes.
