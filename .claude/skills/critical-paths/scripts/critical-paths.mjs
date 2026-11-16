#!/usr/bin/env node
// Critical-path matcher (G2). Same pattern list as CODEOWNERS.
// Usage:
//   node critical-paths.mjs [--base origin/main] [--json] [path ...]
//   node critical-paths.mjs --codeowners CODEOWNERS      (consistency check, exit 1 on drift)
// With no paths it reads `git diff --name-only <base>...HEAD`. Exit code is always 0 for a match
// query (CI reads the output); 1 only for usage errors or CODEOWNERS drift.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { patterns } = JSON.parse(readFileSync(join(here, '..', 'critical-paths.json'), 'utf8'));

export function toRegExp(p) {
  let src = '';
  const rooted = p.includes('/');
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*' && p[i + 1] === '*') {
      if (p[i + 2] === '/') { src += '(?:.*/)?'; i += 2; } else { src += '.*'; i += 1; }
    } else if (c === '*') src += '[^/]*';
    else src += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + (rooted ? '' : '(?:.*/)?') + src + '$');
}
const matchers = patterns.map((p) => [p, toRegExp(p)]);
export function criticalMatches(file) {
  const f = file.replace(/^\.\//, '');
  return matchers.filter(([, re]) => re.test(f)).map(([p]) => p);
}

const argv = process.argv.slice(2);
if (import.meta.url === `file://${process.argv[1]}`) {
  const co = argv.indexOf('--codeowners');
  if (co >= 0) {
    const lines = readFileSync(argv[co + 1], 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const fromFile = new Set(lines.map((l) => l.split(/\s+/)[0].replace(/^\//, '')));
    const mine = new Set(patterns);
    const onlyFile = [...fromFile].filter((x) => !mine.has(x));
    const onlyJson = [...mine].filter((x) => !fromFile.has(x));
    if (onlyFile.length || onlyJson.length) {
      console.error(JSON.stringify({ drift: true, only_in_codeowners: onlyFile, only_in_json: onlyJson }, null, 2));
      process.exit(1);
    }
    console.log('CODEOWNERS and critical-paths.json agree');
    process.exit(0);
  }
  const bi = argv.indexOf('--base');
  const base = bi >= 0 ? argv.splice(bi, 2)[1] : 'origin/main';
  const asJson = argv.includes('--json');
  let files = argv.filter((a) => !a.startsWith('--'));
  if (!files.length) {
    files = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' }).split('\n').filter(Boolean);
  }
  const hits = files.map((f) => ({ file: f, patterns: criticalMatches(f) })).filter((h) => h.patterns.length);
  if (asJson) console.log(JSON.stringify({ critical: hits.length > 0, files: hits }, null, 2));
  else if (hits.length) { console.log('critical: yes'); for (const h of hits) console.log(`  ${h.file}  <- ${h.patterns.join(', ')}`); }
  else console.log('critical: no');
}
