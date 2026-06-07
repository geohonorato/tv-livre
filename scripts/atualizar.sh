#!/bin/bash
# Script de atualização automática dos canais
# Roda no GitHub Actions uma vez por dia

set -e
echo "=== Atualizando canais IPTV ==="

# ===== 1. futemax.cfd — extrair data-src =====
echo "[1/4] Varrendo futemax.cfd..."
CANAL_JSON=$(curl -sL "https://futemax.cfd" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# Extrai links de canais
echo "$CANAL_JSON" | grep -oP 'href="[^"]*(?:globo|sportv|espn|premiere|combate|band|sbt|record|tnt|space)[^"]*"' | head -30 > /tmp/links_canais.txt

FUTEMAX_CANAIS="[]"
while read link; do
  url=$(echo "$link" | grep -oP 'href="([^"]*)"' | sed 's/href="//;s/"//')
  nome=$(echo "$url" | sed 's|https://futemax.cfd/||;s|-ao-vivo.*||;s|-assista.*||;s|-[^/]*$||;s|-online.*||' | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g')
  
  # Busca data-src na página do canal
  pagina=$(curl -sL "$url" -H "User-Agent: Mozilla/5.0" 2>/dev/null)
  data_src=$(echo "$pagina" | grep -oP 'data-src="[^"]*nossoplayeronlinehd[^"]*"' | head -1 | sed 's/data-src="//;s/"//')
  
  if [ -n "$data_src" ]; then
    FUTEMAX_CANAIS=$(echo "$FUTEMAX_CANAIS" | python3 -c "
import json,sys
canais=json.load(sys.stdin)
canais.append({'nome':'$nome','url':'$data_src'})
print(json.dumps(canais))
" 2>/dev/null || echo "$FUTEMAX_CANAIS")
  fi
done < /tmp/links_canais.txt 2>/dev/null

echo "  -> $(echo "$FUTEMAX_CANAIS" | grep -o 'nome' | wc -l) canais encontrados"

# ===== 2. sporturbo — extrair URL do Sportv =====
echo "[2/4] Extraindo Sportv DASH..."
SPORTV_HTML=$(curl -sL "https://sporturbo.com/player/canais/ampv-sportv" \
  -H "User-Agent: Mozilla/5.0 Chrome/120")
SPORTV_URL_B64=$(echo "$SPORTV_HTML" | grep -oP '(?<=const url = ")[A-Za-z0-9+/=]+(?=")' | head -1)
SPORTV_URL=""
if [ -n "$SPORTV_URL_B64" ]; then
  SPORTV_URL=$(echo "$SPORTV_URL_B64" | base64 -d 2>/dev/null)
  echo "  -> Sportv DASH URL extraída"
fi

# ===== 3. Lista IPTV =====
echo "[3/4] Baixando lista IPTV..."
curl -sL "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/br.m3u" -o /tmp/iptv_br.m3u
IPTV_COUNT=$(grep -c "\.m3u8" /tmp/iptv_br.m3u 2>/dev/null || echo "0")
echo "  -> $IPTV_COUNT streams encontrados"

# ===== 4. Gerar canais.json =====
echo "[4/4] Gerando canais.json..."
python3 << 'PYEOF' 2>/dev/null || node -e "
const fs = require('fs');
const futemax = $FUTEMAX_CANAIS;
const json = {
  atualizado: new Date().toISOString(),
  fontes: {
    futemax: futemax,
    sporturbo: [
      { nome: 'SporTV (DASH)', url: '$SPORTV_URL', tipo: 'dash' }
    ],
    iptv: [
      { nome: 'GE Fast', url: 'https://dfr80qz435crc.cloudfront.net/EFGH/Amagi/Globo/GE_Fast_BR/GE_Fast.m3u8', tipo: 'hls' },
      { nome: 'Globo Bahia', url: 'http://hls1.sua.tv/live/globotvbahiafhdbr2/s.m3u8', tipo: 'hls' },
      { nome: 'Amazon Sat', url: 'https://amazonsat.brasilstream.com.br/hls/amazonsat/index.m3u8', tipo: 'hls' }
    ]
  }
};
fs.writeFileSync('canais.json', JSON.stringify(json, null, 2));
console.log('canais.json gerado');
"
echo ""
echo "=== Atualização concluída! ==="
