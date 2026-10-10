import assert from 'node:assert/strict';
import { test } from 'node:test';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
Object.assign(process.env, { NODE_ENV:'test', DB_HOST:'localhost', DB_NAME:'test', DB_USER:'test', DB_PASSWORD:'test', OPENAI_API_KEY:'test', JWT_ACCESS_SECRET:'a'.repeat(32), JWT_REFRESH_SECRET:'b'.repeat(32), UPLOAD_ENCRYPTION_KEY:'c'.repeat(64) });
const { AuthService } = await import('../dist/auth/auth.service.js');
const { AuthGuard } = await import('../dist/auth/auth.guard.js');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
test('reset rejects expired and wrong-purpose tokens before querying users', async () => {
  const service = new AuthService({execute:()=>assert.fail('Must not query')},{sha256});
  for (const extra of [{purpose:'other'}, {purpose:'password-reset',exp:1}]) {
    const token=jwt.sign(extra,process.env.JWT_REFRESH_SECRET,{subject:'7',audience:'krishi-password-reset'});
    await assert.rejects(service.resetPassword({body:{token,password:'new-password-123'}}), /invalid or expired/);
  }
});
test('recovery code is single use and revokes sessions', async () => {
  let hash=await argon2.hash('old-password-123'); let revoked=false;
  const service=new AuthService({execute:async(sql,args)=>{
    if(sql.startsWith('SELECT')) return [[{password_hash:hash}]];
    if(sql.startsWith('UPDATE users')) {assert.equal(args[2],hash);hash=args[0];return [{affectedRows:1}];}
    if(sql.startsWith('UPDATE user_sessions')) {revoked=true;return [{affectedRows:1}];}
    assert.fail(sql);
  }},{sha256});
  const token=jwt.sign({purpose:'password-reset',fingerprint:sha256(hash)},process.env.JWT_REFRESH_SECRET,{subject:'7',audience:'krishi-password-reset',expiresIn:'15m'});
  const req={body:{token,password:'new-password-123'}};
  await service.resetPassword(req);
  assert.ok(await argon2.verify(hash,req.body.password));assert.ok(revoked);
  await assert.rejects(service.resetPassword(req), /invalid or expired/);
});
test('guard rejects access tokens from revoked sessions',async()=>{
  const token=jwt.sign({sid:'session'},process.env.JWT_ACCESS_SECRET,{subject:'7',issuer:'leaf-care-ai',audience:'leaf-care-web'});
  const guard=new AuthGuard({execute:async()=>[[]]});
  await assert.rejects(guard.canActivate({switchToHttp:()=>({getRequest:()=>({headers:{authorization:`Bearer ${token}`}})})}), /Authentication required/);
});
