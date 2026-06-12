const fs = require('fs');
const https = require('https');
const url = require('url');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchHtml(targetUrl, timeout = 15000) {
  return new Promise((resolve) => {
    const parsedUrl = url.parse(targetUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,*/*' },
      timeout
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    }).on('error', (err) => {
      resolve('');
    });
  });
}

// Desofuscação do sporturbo: base64 + fromCharCode - SUBTRACT
function desofuscarSporturbo(html, subtract) {
  const match = html.match(/"([A-Za-z0-9+/=]+)"/g);
  if (!match) return '';
  let output = '';
  for (const item of match) {
    try {
      const clean = item.replace(/"/g, '').replace(/\\/g, '');
      const decoded = Buffer.from(clean, 'base64').toString();
      const nums = decoded.replace(/\D/g, '');
      if (nums) {
        const charCode = parseInt(nums) - subtract;
        output += String.fromCharCode(charCode);
      }
    } catch (e) { /* skip */ }
  }
  // Procurar url= e key= no resultado
  const urlMatch = output.match(/url\s*=\s*['\"]([^'\"]+)['\"]/);
  const keyMatch = output.match(/key\s*=\s*['\"]([^'\"]+)['\"]/);
  return { htmlDecoded: output, url: urlMatch ? urlMatch[1] : '', key: keyMatch ? keyMatch[1] : '' };
}

async function updateChannels() {
  console.log('=== Atualizando canais IPTV ===');
  const canaisLista = [];

  // ===== 1. Varrer futemax5.biz (NOVO) =====
  console.log('[1/4] Varrendo futemax5.biz...');
  const homeHtml = await fetchHtml('https://futemax5.biz');
  if (homeHtml) {
    const linkRegex = /href="\/assistir-([^"]*)"/g;
    let match;
    const slugs = [];
    while ((match = linkRegex.exec(homeHtml)) !== null) {
      slugs.push(match[1]);
    }
    const uniqueSlugs = [...new Set(slugs)];
    console.log(`  -> ${uniqueSlugs.length} canais encontrados. Extraindo data-url...`);

    for (const slug of uniqueSlugs.slice(0, 120)) {
      const pageUrl = `https://futemax5.biz/assistir-${slug}-ao-vivo-em-hd-online`;
      const pageHtml = await fetchHtml(pageUrl, 10000);
      if (pageHtml) {
        const dataUrlMatch = /data-url="([^"]*)"/.exec(pageHtml);
        if (dataUrlMatch) {
          // Nome legível
          const nomeSlug = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          canaisLista.push({
            nome: nomeSlug,
            url: dataUrlMatch[1],
            iframe: true
          });
        }
      }
    }
    console.log(`  -> ${canaisLista.length} canais coletados do futemax5.biz.`);
  }

  // ===== 2. Extrair Sportv DASH (desofuscado) =====
  console.log('[2/4] Extraindo Sportv DASH (sporturbo)...');
  const sportvCanais = [
    { slug: 'ampv-sportv', nome: 'SporTV 1 (DASH)', subtract: 99201687 },
    { slug: 'ampv-sportv2', nome: 'SporTV 2 (DASH)', subtract: 69501930 },
    { slug: 'ampv-sportv3', nome: 'SporTV 3 (DASH)', subtract: 87717379 },
  ];

  for (const sc of sportvCanais) {
    const html = await fetchHtml(`https://sporturbo.com/player/canais/${sc.slug}`, 15000);
    if (html) {
      const result = desofuscarSporturbo(html, sc.subtract);
      if (result.url) {
        canaisLista.push({ nome: sc.nome, url: result.url, tipo: 'dash' });
        console.log(`  -> ${sc.nome}: OK`);
      }
    }
  }

  // ===== 3. Fontes fixas confiáveis =====
  console.log('[3/4] Adicionando fontes fixas...');
  canaisLista.push(
    { nome: 'GE Fast (Globo)', url: 'https://dfr80qz435crc.cloudfront.net/EFGH/Amagi/Globo/GE_Fast_BR/GE_Fast.m3u8', tipo: 'hls' },
    { nome: 'Globo Bahia', url: 'http://hls1.sua.tv/live/globotvbahiafhdbr2/s.m3u8', tipo: 'hls' },
    { nome: 'Amazon Sat', url: 'https://amazonsat.brasilstream.com.br/hls/amazonsat/index.m3u8', tipo: 'hls' }
  );

  // Backup: se sporturbo falhar, usar URLs conhecidas
  const temSportv = canaisLista.some(c => c.nome.includes('SporTV') && c.tipo === 'dash');
  if (!temSportv) {
    canaisLista.push(
      { nome: 'SporTV 1 (DASH)', url: 'https://otte.live.fly.ww.aiv-cdn.net/gru-nitro/live/clients/dash/enc/m7duvnk2bu/out/v1/d1ad69118b5647309b1eb7213affdb3d/cenc.mpd', tipo: 'dash' },
      { nome: 'SporTV 2 (DASH)', url: 'https://otte.live.fly.ww.aiv-cdn.net/gru-nitro/live/clients/dash/enc/dsa3hwuhd1/out/v1/631b48c8d9ea437e8309d1a4b55acef5/cenc.mpd', tipo: 'dash' },
      { nome: 'SporTV 3 (DASH)', url: 'https://otte.live.fly.ww.aiv-cdn.net/gru-nitro/live/clients/dash/enc/6otiglnptp/out/v1/add7499679b0422cb6791f7701f95ecc/cenc.mpd', tipo: 'dash' }
    );
    console.log('  -> Usando URLs DASH de backup (sporturbo falhou)');
  }

  // ===== 4. Salvar =====
  console.log(`[4/4] Gerando canais.json (${canaisLista.length} canais)...`);
  try {
    fs.writeFileSync('canais.json', JSON.stringify(canaisLista, null, 2), 'utf-8');
    console.log('=== Atualizacao concluida! ===');
  } catch (e) {
    console.error('Erro ao salvar canais.json:', e);
  }
}

updateChannels();
