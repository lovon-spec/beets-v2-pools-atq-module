import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/main.mts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const deployment = 'QmPXaLKDvMMZdjD1ZuMpMSkRjKf8ALLVRtjUpTwWdKSvpQ';
const meta = { deployment, hasIndexingErrors: false, block: { number: 100, hash: '0x' + 'ab'.repeat(32) } };
const pool = (n, name = 'Published pool') => {
  const address = '0x' + n.toString(16).padStart(40, '0');
  return { address, id: address + '00'.repeat(12), name, symbol: 'BPT' };
};
async function run(pools, transform = x => x, chain = '146') {
  let calls = 0;
  const context = vm.createContext({ AbortController, setTimeout, clearTimeout });
  const fetch = async (url, options) => {
    assert.equal(url, 'https://gateway.thegraph.com/api/deployments/id/' + deployment);
    assert.equal(options.headers.Authorization, 'Bearer fixture-key');
    const query = JSON.parse(options.body).query; calls++;
    if (calls > 1) assert.ok(query.includes(meta.block.hash));
    const data = calls === 1 ? { _meta: meta } : { _meta: meta, pools };
    return { ok: true, json: async () => transform({ data }, calls) };
  };
  const dependency = new vm.SyntheticModule(['default'], function () { this.setExport('default', fetch); }, { context });
  const module = new vm.SourceTextModule(compiled, { context });
  await module.link(name => { assert.equal(name, 'node-fetch'); return dependency; });
  await module.evaluate();
  return JSON.parse(JSON.stringify(await module.namespace.returnTags(chain, 'fixture-key')));
}
test('retains official common names, exact pool IDs and token role without generated suffixes', async () => {
  const rows = await run([pool(1), pool(2)]);
  assert.equal(rows.length, 2); assert.equal(rows[0]['Public Name Tag'], 'Published pool');
  assert.equal(rows[1]['Public Name Tag'], 'Published pool');
  assert.ok(rows[0]['Public Note'].includes('Beets V2 (Balancer V2) liquidity pool and pool share token'));
  assert.ok(rows[0]['Public Note'].includes(pool(1).id));
});
test('truncates source names to 50 Unicode characters with ellipsis', async () => {
  const [row] = await run([pool(1, '🎵'.repeat(51))]);
  assert.equal(Array.from(row['Public Name Tag']).length, 50);
  assert.equal(row['Public Name Tag'], '🎵'.repeat(47) + '...');
});
test('rejects malformed Graph errors instead of returning plausible partial data', async () => {
  for (const errors of [{ length: 0 }, null, ['unavailable']]) {
    await assert.rejects(run([pool(1)], x => ({ ...x, errors })), /incomplete or contains errors/);
  }
});
test('rejects wrong deployment, indexing errors and changed snapshot', async () => {
  for (const change of [{ deployment: 'wrong' }, { hasIndexingErrors: true }]) {
    await assert.rejects(run([], x => ({ data: { ...x.data, _meta: { ...meta, ...change } } })), /Invalid source/);
  }
  await assert.rejects(run([], (x, n) => n === 1 ? x : ({ data: { ...x.data, _meta: { ...meta, block: { ...meta.block, number: 101 } } } })), /Source block changed/);
});
test('rejects mismatched IDs, control characters and duplicate addresses', async () => {
  for (const rows of [[{ ...pool(1), id: pool(2).id }], [pool(1, 'bad\u0000name')], [pool(1), pool(1)]]) {
    await assert.rejects(run(rows), /Invalid pool|disagree|Duplicate|cursor/);
  }
});
test('rejects unsupported chains before any network read', async () => {
  await assert.rejects(run([], () => assert.fail('must not read'), '100'), /Unsupported Chain ID/);
});
