// Measures the production build on vite preview (dev-server numbers are meaningless).
// Warnings only until the G1 baseline turns into budgets; run via lighthouse/run.mjs.
const PREVIEW = 'http://localhost:4173';

const PAGES = ['/', '/classic', '/blurry', '/pixelated', '/idols', '/idols/1/kim-chaewon-le-sserafim'];

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node lighthouse/serve.mjs',
      startServerReadyPattern: 'LIGHTHOUSE_SERVER_READY',
      startServerReadyTimeout: 120000,
      url: PAGES.map((p) => `${PREVIEW}${p}`),
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.95 }],
        'categories:seo': ['warn', { minScore: 0.95 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci/reports',
    },
  },
};
