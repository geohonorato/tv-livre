# 📺 TV Livre

Player IPTV premium com canais brasileiros atualizados automaticamente via GitHub Actions.

## ✨ Funcionalidades

- 🎨 **Interface Premium** — Design moderno com glassmorphism, gradientes e micro-animações
- ⭐ **Favoritos** — Salve seus canais preferidos (persistido no navegador)
- 🏷️ **Categorias** — Filtre por Esportes, TV Aberta, Filmes e mais
- 🔍 **Busca instantânea** — Encontre qualquer canal em tempo real
- ⌨️ **Atalhos de teclado** — Espaço (play), M (mudo), F (tela cheia), ←→ (trocar canal)
- 🔔 **Notificações toast** — Feedback visual em todas as ações
- 🔊 **Controle de volume** — Slider integrado no player
- 📱 **Responsivo** — Funciona no desktop e mobile
- 🔄 **Auto-atualização** — GitHub Actions atualiza canais 2x ao dia
- 🛡️ **Iframe isolado** — Sandbox para segurança contra redirects

## Como funciona

1. Uma **GitHub Action** roda 2x ao dia (6h e 18h)
2. Varre os sites de streaming e extrai os links dos canais
3. Atualiza o `canais.json`
4. Faz deploy automático no **GitHub Pages**
5. O `index.html` carrega o JSON e monta o player

## Setup (uma vez)

1. Crie um repositório no GitHub (ex: `tv-livre`)
2. Vá em **Settings → Pages** e selecione Source: **GitHub Actions**
3. Vá em **Settings → Actions → General**: marque "Read and write permissions"
4. Faça push dos arquivos:
```bash
git init
git add .
git commit -m "🎬 TV Livre - IPTV automática"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/tv-livre.git
git push -u origin main
```

Depois é só acessar: `https://SEU_USUARIO.github.io/tv-livre/`

## Estrutura

```
├── index.html                 # Player premium (carrega canais.json)
├── canais.json                # Lista de canais (atualizada automaticamente)
├── scripts/
│   └── atualizar.sh           # Script de varredura
└── .github/workflows/
    └── atualizar.yml          # GitHub Action (roda 2x/dia)
```

## Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `Espaço` | Play / Pause |
| `M` | Mutar / Desmutar |
| `F` | Tela cheia |
| `←` | Canal anterior |
| `→` | Próximo canal |
| `Esc` | Fechar sidebar (mobile) |

> 💡 Use com **uBlock Origin** para bloquear anúncios nos iframes.
