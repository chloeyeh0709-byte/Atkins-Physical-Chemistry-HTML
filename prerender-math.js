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
  'chapters/09_量子力學技術與應用.html',
  'chapters/10_原子結構與原子光譜.html',
  'chapters/11_分子結構.html',
  'chapters/12_分子對稱性.html',
  'chapters/13_分子光譜學一轉動與振動光譜.html',
  'chapters/14_分子光譜學二電子躍遷.html',
  'chapters/15_分子光譜學三磁共振.html',
  'chapters/16_統計熱力學一概念.html',
  'chapters/17_統計熱力學二應用.html',
  'chapters/18_分子交互作用.html',
  'chapters/19_材料一高分子與聚集體.html',
  'chapters/20_材料二固態.html',
  'chapters/21_分子運動.html',
  'chapters/22_化學反應速率.html',
  'chapters/23_複雜反應動力學.html',
  'chapters/24_分子反應動力學.html',
  'chapters/25_固體表面過程.html',
  'organic/chapters/01_有機化學是什麼.html',
  'organic/chapters/02_有機結構.html',
  'organic/chapters/03_測定有機結構.html',
  'organic/chapters/04_分子結構.html',
  'organic/chapters/05_有機反應.html',
  'organic/chapters/06_親核加成至羰基.html',
  'organic/chapters/07_離域化與共軛.html',
  'organic/chapters/08_酸鹼性與pKa.html',
  'organic/chapters/09_有機金屬試劑製備CC鍵.html',
  'organic/chapters/10_羰基的親核取代.html',
  'organic/chapters/11_羰基氧的取代.html',
  'organic/chapters/12_平衡速率與機制.html',
  'organic/chapters/13_質子核磁共振.html',
  'organic/chapters/14_立體化學.html',
  'organic/chapters/15_飽和碳的親核取代.html',
  'organic/chapters/16_構形分析.html',
  'organic/chapters/17_消除反應.html',
  'organic/chapters/18_光譜學方法複習.html',
  'organic/chapters/19_親電加成至烯烴.html',
  'organic/chapters/20_烯醇與烯醇酯的形成與反應.html',
  'organic/chapters/21_親電芳香取代.html',
  'organic/chapters/22_共軛加成與親核芳香取代.html',
  'organic/chapters/23_化學選擇性與保護基.html',
  'organic/chapters/24_區位選擇性.html',
  'organic/chapters/25_烯醇鹽的烷基化.html',
  'organic/chapters/26_烯醇鹽與羰基化合物的反應_羥醛與克萊森反應.html',
  'organic/chapters/27_硫矽磷在有機化學中的應用.html',
  'organic/chapters/28_逆合成分析.html',
  'organic/chapters/29_芳香雜環1反應.html',
  'organic/chapters/30_芳香雜環2合成.html',
  'organic/chapters/31_飽和雜環與立體電子效應.html',
  'organic/chapters/32_環狀分子的立體選擇性.html',
  'organic/chapters/33_非對映選擇性.html',
  'organic/chapters/34_周環反應1環加成.html',
  'organic/chapters/35_周環反應2σ遷移與電環反應.html',
  'organic/chapters/36_鄰基參與重排與斷裂.html',
  'organic/chapters/37_自由基反應.html',
  'organic/chapters/38_卡賓的合成與反應.html',
  'organic/chapters/39_反應機制的測定.html',
  'organic/chapters/40_有機金屬化學.html',
  'organic/chapters/41_不對稱合成.html',
  'organic/chapters/42_生命的有機化學.html',
  'organic/chapters/43_當代有機化學.html',
  'inorganic/chapters/04_對稱性與群論.html',
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
