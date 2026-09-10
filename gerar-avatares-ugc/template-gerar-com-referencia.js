#!/usr/bin/env node
/**
 * Gera imagem via Gemini 3.1 Flash Image usando UMA imagem de referência (multimodal).
 *
 * Uso:
 *   node gerar-com-referencia.js <imagem-ref> "<prompt>" <arquivo-saida> [aspect]
 *
 * aspect: 1:1 | 9:16 | 16:9 | 3:4 | 4:3   (default 3:4)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) { console.error('.env nao encontrado em', envPath); process.exit(1); }
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}
loadEnv();

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
if (!KEY || !KEY.startsWith('AIza')) { console.error('GEMINI_API_KEY invalida'); process.exit(1); }

const [refPath, prompt, outPath, aspect = '3:4'] = process.argv.slice(2);
if (!refPath || !prompt || !outPath) {
  console.error('Uso: node gerar-com-referencia.js <ref> "<prompt>" <saida> [aspect]');
  process.exit(1);
}
if (!fs.existsSync(refPath)) { console.error('Imagem ref nao encontrada:', refPath); process.exit(1); }

const refBytes = fs.readFileSync(refPath);
const refB64 = refBytes.toString('base64');
const ext = path.extname(refPath).toLowerCase().replace('.', '');
const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

const fullPrompt = prompt + ` (${aspect} aspect ratio)`;

const body = JSON.stringify({
  contents: [{
    parts: [
      { inline_data: { mime_type: mime, data: refB64 } },
      { text: fullPrompt }
    ]
  }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: `/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('Gerando via', MODEL);
console.log('Ref:', refPath, '(' + refBytes.length + ' bytes)');
console.log('Saida:', outPath);

const req = https.request(options, res => {
  let chunks = '';
  res.on('data', c => { chunks += c; });
  res.on('end', () => {
    fs.writeFileSync('/tmp/gemini-raw.json', chunks);
    let parsed;
    try { parsed = JSON.parse(chunks); }
    catch (e) { console.error('Resposta invalida:', chunks.slice(0, 400)); process.exit(1); }

    if (parsed.error) { console.error('Erro API:', parsed.error.message); process.exit(1); }

    const cand = parsed.candidates && parsed.candidates[0];
    if (!cand) { console.error('Sem candidates:', JSON.stringify(parsed).slice(0, 400)); process.exit(1); }

    const parts = (cand.content && cand.content.parts) || [];
    const imgPart = parts.find(p => p.inline_data || p.inlineData);
    if (!imgPart) {
      const txt = parts.map(p => p.text).filter(Boolean).join('\n');
      console.error('Sem imagem na resposta. Texto:', txt || JSON.stringify(parts).slice(0, 400));
      process.exit(1);
    }

    const data = (imgPart.inline_data || imgPart.inlineData).data;
    const buf = Buffer.from(data, 'base64');
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, buf);
    console.log('OK ' + outPath + ' (' + buf.length + ' bytes)');
  });
});
req.on('error', e => { console.error('Erro rede:', e.message); process.exit(1); });
req.write(body);
req.end();
