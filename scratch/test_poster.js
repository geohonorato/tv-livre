const https = require('https');
const url = require('url');
const fs = require('fs');

function getPage(targetUrl) {
  return new Promise((resolve) => {
    const parsed = url.parse(targetUrl);
    const options = {
      hostname: parsed.hostname,
      path: parsed.path,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://futemax.cfd/'
      }
    };
    https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(getPage(res.headers.location));
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }
    }).on('error', err => {
      resolve(null);
    });
  });
}

async function start() {
  const res = await getPage('https://nossoplayeronlinehd.ink/tv/sbt');
  if (res) {
    fs.writeFileSync('scratch/player_page.html', res.body, 'utf-8');
    console.log('Saved html to scratch/player_page.html');
    
    // Look for video tags
    const videoMatches = res.body.match(/<video[^>]*>/g);
    console.log('Video Tags:', videoMatches);
    
    // Look for clappr or other player scripts
    const scriptMatches = res.body.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
    console.log('Script tag count:', scriptMatches ? scriptMatches.length : 0);
    
    // Scan all scripts for anything containing "poster" or "jpg" or "png"
    if (scriptMatches) {
      scriptMatches.forEach((s, idx) => {
        if (s.includes('poster') || s.includes('jpg') || s.includes('png')) {
          console.log(`Script ${idx} has image terms. Length: ${s.length}`);
          // Print first 500 chars of this script
          console.log(s.substring(0, 500));
        }
      });
    }
  }
}

start();
