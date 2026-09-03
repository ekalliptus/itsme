// scripts/indexnow.mjs
// Pings IndexNow (Bing + engines sharing the protocol) after deployment.
// Run once per deploy: node scripts/indexnow.mjs
import { readFileSync } from 'node:fs';

const HOST = 'bio.ekalliptus.com';
const key = readFileSync('.indexnow-key', 'utf8').trim();
const keyLocation = `https://${HOST}/${key}.txt`;
const urlList = [
  `https://${HOST}/`,
  `https://${HOST}/about/`,
  `https://${HOST}/skills/`,
  `https://${HOST}/projects/`,
  `https://${HOST}/contact/`,
];

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation, urlList }),
});
console.log(`IndexNow response: ${res.status} ${res.statusText}`);
if (!res.ok && res.status !== 202) process.exit(1);
