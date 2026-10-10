import assert from 'node:assert/strict';
import { test } from 'node:test';
Object.assign(process.env, { NODE_ENV:'test', DB_HOST:'localhost', DB_NAME:'test', DB_USER:'test', DB_PASSWORD:'test', OPENAI_API_KEY:'test', JWT_ACCESS_SECRET:'a'.repeat(32), JWT_REFRESH_SECRET:'b'.repeat(32), UPLOAD_ENCRYPTION_KEY:'c'.repeat(64) });
const { AuthService } = await import('../dist/auth/auth.service.js');
const { farmDetailsSchema } = await import('../dist/auth/farm-schema.js');
test('farm validation rejects malformed dates, measurements and unknown fields', () => {
  for (const farm of [{sowingDate:'2026-02-30'}, {latitude:'91'}, {soilPh:'15'}, {area:'-1'}, {area:'abc'}, {soilType:'unsupported'}, {unknown:'value'}, {notes:'x'.repeat(2001)}]) {
    assert.equal(farmDetailsSchema.safeParse(farm).success, false);
  }
  assert.deepEqual(farmDetailsSchema.parse({area:'2.5', previousCrop:' Rice ', sowingDate:'2026-06-01'}), {area:'2.5',previousCrop:'Rice',sowingDate:'2026-06-01'});
  assert.equal(farmDetailsSchema.safeParse({area:'',sowingDate:''}).success, true);
});
test('profile saves farm details scoped to authenticated user and returns them', async () => {
  let saved;
  const service = new AuthService({execute:async (sql, args) => {
    if (sql.startsWith('UPDATE')) {
      assert.match(sql,/farm_details=\?/); assert.equal(args[3], '7'); saved = JSON.parse(args[2]); return [{affectedRows:1}];
    }
    assert.equal(args[0], '7');
    return [[{id:7,full_name:'Farmer',email:'farmer@example.com',preferred_language:'en',role:'USER',farm_details:JSON.stringify(saved)}]];
  }}, {});
  const result = await service.updateProfile({user:{sub:'7'},body:{fullName:'Farmer',language:'en',farmDetails:{presentCrop:'Cotton',previousCrop:'Rice'}}});
  assert.deepEqual(result.farmDetails,{presentCrop:'Cotton',previousCrop:'Rice'});
});
test('personal profile edits preserve farm data and invalid farm data never writes', async () => {
  let updates = 0;
  const service = new AuthService({execute:async (sql) => {
    if (sql.startsWith('UPDATE')) { assert.doesNotMatch(sql,/farm_details/); updates++; return [{affectedRows:1}]; }
    return [[{full_name:'Farmer',preferred_language:'en',farm_details:{presentCrop:'Cotton'}}]];
  }}, {});
  assert.equal((await service.updateProfile({user:{sub:'7'},body:{fullName:'Farmer',language:'en'}})).farmDetails.presentCrop,'Cotton');
  await assert.rejects(service.updateProfile({user:{sub:'7'},body:{fullName:'Farmer',language:'en',farmDetails:{area:'-2'}}}));
  assert.equal(updates,1);
});
