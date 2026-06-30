#!/usr/bin/env node
'use strict';
const fs = require('fs');
const katex = require('katex');

const files = [
  'chapters/01_氣體的性質.html',
  'chapters/02_熱力學第一定律.html',
  'chapters/03_熱力學第二定律.html',
  'chapters/04_純物質的物理變化.html',
  'chapters/05_簡單混合物.html',
  'chapters/06_相圖.html',
  'chapters/07_化學平衡.html',
  'chapters/08_量子理論導論.html',
];

function renderDisplay(latex) {
  return katex.renderToString(latex.trim(), {
    displayMode: true,
    throwOnError: false,
    trust: true,
    strict: false,
  });
}

function renderInline(latex) {
  return katex.renderToString(latex, {
    displayMode: false,
    throwOnError: false,
    trust: true,
    strict: false,
  });
}

function prerender(html) {
  /* ── 0. Remove KaTeX JS script tags BEFORE stashing ── */
  /* (the CSS <link> stays — it's needed to style the pre-rendered HTML) */
  html = html.replace(/\n?\s*<script[^>]+katex\.min\.js[^>]*><\/script>/g, '');
  html = html.replace(/\n?\s*<script[^>]+auto-render\.min\.js[^>]*>[\s\S]*?<\/script>/g, '');

  /* ── 1. Stash <script> and <style> blocks so we don't touch them ── */
  const stash = [];
  html = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, m => {
    stash.push(m);
    return `\x00STASH${stash.length - 1}\x00`;
  });

  /* ── 2. Display math  $$...$$  (possibly multi-line) ── */
  let count = { display: 0, inline: 0, err: 0 };
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    try {
      count.display++;
      return renderDisplay(latex);
    } catch (e) {
      count.err++;
      console.error('[display error]', e.message.slice(0, 80), '\n  LaTeX:', latex.trim().slice(0, 60));
      return `<span class="math-error" title="${e.message.replace(/"/g,"'")}">$$${latex}$$</span>`;
    }
  });

  /* ── 3. Inline math  $...$  ── */
  /* Match $...$ where the interior has no $, newline, or raw HTML angle brackets */
  html = html.replace(/\$([^$\n<>]{1,500}?)\$/g, (full, latex) => {
    if (!latex.trim()) return full;            // skip lone $
    if (/^\s*\d+(\.\d+)?\s*$/.test(latex)) return full; // skip bare numbers
    try {
      count.inline++;
      return renderInline(latex);
    } catch (e) {
      count.err++;
      console.error('[inline error]', e.message.slice(0, 80), '\n  LaTeX:', latex.slice(0, 60));
      return `<span class="math-error" title="${e.message.replace(/"/g,"'")}">$${latex}$</span>`;
    }
  });

  /* ── 4. Restore stashed blocks ── */
  stash.forEach((block, i) => {
    html = html.replace(`\x00STASH${i}\x00`, block);
  });

  console.log(`  display: ${count.display}, inline: ${count.inline}, errors: ${count.err}`);
  return html;
}

files.forEach(f => {
  console.log(`Processing ${f} …`);
  const src = fs.readFileSync(f, 'utf8');
  const out = prerender(src);
  fs.writeFileSync(f, out, 'utf8');
  console.log(`  ✓ written (${Math.round(out.length / 1024)} KB)\n`);
});
