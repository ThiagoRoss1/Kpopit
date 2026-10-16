import test from 'node:test';
import assert from 'node:assert/strict';
import { testDatabaseUrl } from '../../e2e/support/env.ts';

test('E2E rejects remote hosts and libpq routing overrides before starting a backend', () => {
  const originalUrl = process.env.E2E_DB_URL;
  const originalName = process.env.E2E_DB_NAME;
  process.env.E2E_DB_NAME = 'kpopit_e2e';
  try {
    for (const url of [
      'postgresql://test@remote.invalid/kpopit_e2e',
      'postgresql://test@localhost/other',
      'postgresql://test@localhost/kpopit_e2e?host=remote.invalid',
      'postgresql://test@localhost/kpopit_e2e?dbname=other',
    ]) {
      process.env.E2E_DB_URL = url;
      assert.throws(() => testDatabaseUrl());
    }
    const local = 'postgresql://test@127.0.0.1:55432/kpopit_e2e';
    process.env.E2E_DB_URL = local;
    assert.equal(testDatabaseUrl(), local);
  } finally {
    if (originalUrl === undefined) delete process.env.E2E_DB_URL; else process.env.E2E_DB_URL = originalUrl;
    if (originalName === undefined) delete process.env.E2E_DB_NAME; else process.env.E2E_DB_NAME = originalName;
  }
});
