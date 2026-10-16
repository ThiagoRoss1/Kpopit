// Usage: node lighthouse/summarize.mjs <reportsDir> [...] — one dir per device.
// Medians per URL, so one noisy run doesn't move the table.
import fs from 'node:fs';
import path from 'node:path';

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function summarizeDir(dir) {
  const byUrl = new Map();
  for (const f of fs.readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f))) {
    const lhr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const url = new URL(lhr.requestedUrl).pathname;
    const scripts = lhr.audits['resource-summary']?.details?.items?.find((i) => i.resourceType === 'script');
    const row = {
      device: lhr.configSettings.formFactor,
      performance: lhr.categories.performance.score * 100,
      accessibility: lhr.categories.accessibility.score * 100,
      bestPractices: lhr.categories['best-practices'].score * 100,
      seo: lhr.categories.seo.score * 100,
      lcp: lhr.audits['largest-contentful-paint'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
      tbt: lhr.audits['total-blocking-time'].numericValue,
      jsKb: (scripts?.transferSize ?? 0) / 1024,
    };
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url).push(row);
  }
  return [...byUrl.entries()].map(([url, runs]) => {
    const pick = (k) => median(runs.map((r) => r[k]));
    return {
      url,
      device: runs[0].device,
      runs: runs.length,
      performance: pick('performance'),
      accessibility: pick('accessibility'),
      bestPractices: pick('bestPractices'),
      seo: pick('seo'),
      lcp: pick('lcp'),
      cls: pick('cls'),
      tbt: pick('tbt'),
      jsKb: pick('jsKb'),
    };
  });
}

export function toMarkdown(rows) {
  const head =
    '| Page | Device | Perf | A11y | Best pr. | SEO | LCP (s) | CLS | TBT (ms) | JS (KB, transfer) | Runs |\n' +
    '|---|---|---|---|---|---|---|---|---|---|---|';
  const body = rows
    .map(
      (r) =>
        `| \`${r.url}\` | ${r.device} | ${Math.round(r.performance)} | ${Math.round(r.accessibility)} | ` +
        `${Math.round(r.bestPractices)} | ${Math.round(r.seo)} | ${(r.lcp / 1000).toFixed(2)} | ` +
        `${r.cls.toFixed(3)} | ${Math.round(r.tbt)} | ${Math.round(r.jsKb)} | ${r.runs} |`,
    )
    .join('\n');
  return `${head}\n${body}`;
}

if (process.argv[1]?.endsWith('summarize.mjs')) {
  const dirs = process.argv.slice(2);
  const rows = dirs.flatMap(summarizeDir);
  console.log(toMarkdown(rows));
}
