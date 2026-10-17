import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';

const root = resolve('dist');
const readAsset = async (path) => {
  const full = resolve(root, path);
  if (!full.startsWith(root + sep)) throw new Error('Asset path is outside dist');
  return readFile(full);
};
let html = await readFile(resolve(root,'index.html'),'utf8');
const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const style = html.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/);
if (!script || !style) throw new Error('Expected a single compiled script and stylesheet');
const javascript = (await readAsset(script[1])).toString('utf8');
let css = (await readAsset(style[1])).toString('utf8');
const assetUrls = [...css.matchAll(/url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/g)];
for (const match of assetUrls) {
  const value = (match[1] ?? match[2] ?? match[3]).trim();
  if (value.startsWith('data:')) continue;
  const path = resolve(root, dirname(style[1]), value);
  const font = await readAsset(path);
  const mime = extname(path) === '.woff2' ? 'font/woff2' : 'font/woff';
  css = css.replace(match[0], `url(data:${mime};base64,${font.toString('base64')})`);
}
html = html.replace(script[0], () => `<script type="module">${javascript.replace(/<\/script/gi,'<\\/script')}</script>`);
html = html.replace(style[0], () => `<style>${css}</style>`);
const escapeHtml = (value) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const licenses = await Promise.all(['Prata-OFL.txt','Golos-Text-OFL.txt'].map(name=>readFile(resolve(root,'licenses',name),'utf8')));
html = html.replace('</body>', () => `<template id="font-licenses">${escapeHtml(licenses.join('\n\n'))}</template>\n</body>`);
await writeFile(resolve(root,'quiet-hour.html'),html);
console.log(`Standalone game: dist/quiet-hour.html (${Math.round(Buffer.byteLength(html)/1024)} KiB). Open it directly in your browser.`);
