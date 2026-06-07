const fs = require('fs');
const https = require('https');
const url = require('url');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchHtml(targetUrl) {
  return new Promise((resolve) => {
    const parsedUrl = url.parse(targetUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    }).on('error', (err) => {
      console.error(`Erro ao carregar ${targetUrl}: ${err.message}`);
      resolve('');
    });
  });
}

function cleanName(name) {
  if (!name) return "";
  let clean = name;
  // Remove suffixes
  clean = clean.replace(/\b(?:Esportes|Futebol|Noticias|E|Programas|Internacional|Ao Vivo|Online|Assista|Em|Hd|No|Fc)\b/gi, '').trim();
  // Replace double spaces
  clean = clean.replace(/\s+/g, ' ');

  // Specific corrections
  const replacements = [
    { regex: /\bsportv\b/i, value: "SporTV" },
    { regex: /\bespn\b/i, value: "ESPN" },
    { regex: /\bsbt\b/i, value: "SBT" },
    { regex: /\btnt\b/i, value: "TNT" },
    { regex: /\bband\s*tv\b/i, value: "Band TV" },
    { regex: /\bbandsports\b/i, value: "BandSports" },
    { regex: /\brecordtv\b/i, value: "Record TV" },
    { regex: /\brecord\s*tv\b/i, value: "Record TV" },
    { regex: /\bglobo\s*sp\b/i, value: "Globo SP" },
    { regex: /\bglobo\s*rj\b/i, value: "Globo RJ" },
    { regex: /\bge\s*fast\b/i, value: "GE Fast" },
    { regex: /\bpremiere\s*fc\b/i, value: "Premiere" }
  ];

  replacements.forEach(r => {
    clean = clean.replace(r.regex, r.value);
  });

  return clean.trim();
}

async function updateChannels() {
  console.log('=== Atualizando canais IPTV ===');

  // ===== 1. Varrer futemax.cfd =====
  console.log('[1/4] Varrendo futemax.cfd...');
  const futemaxHtml = await fetchHtml('https://futemax.cfd');
  const futemaxCanais = [];

  if (futemaxHtml) {
    const linkRegex = /href="([^"]*(?:globo|sportv|espn|premiere|combate|band|sbt|record|tnt|space)[^"]*)"/g;
    let match;
    const links = [];
    while ((match = linkRegex.exec(futemaxHtml)) !== null) {
      links.push(match[1]);
    }

    // Unicos
    const uniqueLinks = [...new Set(links)].slice(0, 30);

    for (const channelUrl of uniqueLinks) {
      try {
        const parsed = url.parse(channelUrl);
        const pathPart = parsed.pathname.replace(/^\/|\/$/g, '');
        const namePart = pathPart.replace(/-ao-vivo|-assista|-online/g, '').replace(/-[^-]+$/, '');
        let nome = namePart.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        nome = cleanName(nome);

        console.log(`  -> Buscando player para: ${nome}`);
        const channelHtml = await fetchHtml(channelUrl);
        if (channelHtml) {
          const srcMatch = /data-src="([^"]*nossoplayeronlinehd[^"]*)"/.exec(channelHtml);
          if (srcMatch) {
            futemaxCanais.push({
              nome: nome,
              url: srcMatch[1],
              iframe: true
            });
          }
        }
      } catch (e) {
        console.error(`Erro ao processar link ${channelUrl}:`, e);
      }
    }
  }

  console.log(`  -> ${futemaxCanais.length} canais futemax encontrados.`);

  // ===== 2. Extrair Sportv DASH =====
  console.log('[2/4] Extraindo Sportv DASH...');
  const sportvHtml = await fetchHtml('https://sporturbo.com/player/canais/ampv-sportv');
  let sportvUrl = '';
  if (sportvHtml) {
    const match = /const url\s*=\s*"([A-Za-z0-9+/=]+)"/.exec(sportvHtml);
    if (match) {
      try {
        sportvUrl = Buffer.from(match[1], 'base64').toString('utf-8');
        console.log('  -> Sportv DASH URL extraída com sucesso.');
      } catch (e) {
        console.error('  -> Erro ao decodificar base64:', e);
      }
    }
  }

  // ===== 3. Lista IPTV & Fontes Fixas =====
  console.log('[3/4] Configurando canais IPTV fixos...');
  const canaisLista = [];

  // Add futemax channels
  canaisLista.push(...futemaxCanais);

  // Add Sportv DASH
  if (sportvUrl) {
    canaisLista.push({
      nome: 'SporTV (DASH)',
      url: sportvUrl,
      tipo: 'dash'
    });
  } else {
    canaisLista.push({
      nome: 'SporTV (DASH)',
      url: 'https://otte.live.fly.ww.aiv-cdn.net/gru-nitro/live/clients/dash/enc/m7duvnk2bu/out/v1/d1ade69118b5647309b1eb7213affdb3d/cenc.mpd',
      tipo: 'dash'
    });
  }

  // Add reliable IPTV
  canaisLista.push(
    { nome: 'GE Fast (Globo)', url: 'https://dfr80qz435crc.cloudfront.net/EFGH/Amagi/Globo/GE_Fast_BR/GE_Fast.m3u8', tipo: 'hls' },
    { nome: 'Globo Bahia', url: 'http://hls1.sua.tv/live/globotvbahiafhdbr2/s.m3u8', tipo: 'hls' },
    { nome: 'Amazon Sat', url: 'https://amazonsat.brasilstream.com.br/hls/amazonsat/index.m3u8', tipo: 'hls' }
  );

  // ===== 4. Salvar canais.json =====
  console.log('[4/4] Gerando canais.json...');
  try {
    fs.writeFileSync('canais.json', JSON.stringify(canaisLista, null, 2), 'utf-8');
    console.log('=== Atualização concluída com sucesso! ===');
  } catch (e) {
    console.error('Erro ao salvar canais.json:', e);
  }
}

updateChannels();
