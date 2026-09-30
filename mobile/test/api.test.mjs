import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

process.env.EXPO_PUBLIC_API_URL = 'https://leaf.example/';
const source = readFileSync(new URL('../src/api.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { request, ApiError } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('JSON requests use the existing API path and bearer token without browser cookies', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://leaf.example/api/analyses');
    assert.equal(options.headers.Authorization, 'Bearer access-token');
    assert.equal(options.credentials, 'omit');
    return Response.json([{ id: 'saved-analysis' }]);
  };
  try { assert.deepEqual(await request('/analyses', 'access-token'), [{ id: 'saved-analysis' }]); }
  finally { globalThis.fetch = original; }
});

test('multipart uploads leave the boundary header to the native fetch implementation', async () => {
  const original = globalThis.fetch;
  const form = new FormData(); form.append('consent', 'true');
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.body, form);
    assert.equal(options.headers['Content-Type'], undefined);
    return Response.json({ id: 'new-analysis' });
  };
  try { await request('/analyses', 'token', { method: 'POST', body: form }); }
  finally { globalThis.fetch = original; }
});

test('expired sessions preserve HTTP status for the sign-in flow', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: 'Session expired' }, { status: 401 });
  try { await assert.rejects(request('/analyses', 'expired'), error => error instanceof ApiError && error.status === 401 && error.message === 'Session expired'); }
  finally { globalThis.fetch = original; }
});

test('logout accepts an empty 204 response', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try { assert.equal(await request('/auth/logout', 'token', { method: 'POST' }), undefined); }
  finally { globalThis.fetch = original; }
});
