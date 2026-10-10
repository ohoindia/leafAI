import assert from 'node:assert/strict';
import { test } from 'node:test';
import argon2 from 'argon2';
Object.assign(process.env, { NODE_ENV:'test', DB_HOST:'localhost', DB_NAME:'test', DB_USER:'test', DB_PASSWORD:'test', OPENAI_API_KEY:'test', JWT_ACCESS_SECRET:'a'.repeat(32), JWT_REFRESH_SECRET:'b'.repeat(32), UPLOAD_ENCRYPTION_KEY:'c'.repeat(64) });
const { encrypt, decrypt } = await import('../dist/security.js');
const { AuthService } = await import('../dist/auth/auth.service.js');
const guid='12345678-1234-4234-8234-123456789012';
function fixture({user=true, history=[], record, enabled='false'}={}) {
 const writes=[];
 const execute=async(sql,args)=> {
  if(sql.includes('FROM ConfigValues')) return [[{ConfigKey:'OTP_SEND_ENABLED',ConfigValue:enabled},{ConfigKey:'SMS_PROVIDER',ConfigValue:'msg91'}]];
  if(sql.includes('FROM ConfigSecrets')) return [[]];
  if(sql.includes('SELECT id FROM users')) return [user?[{id:7}]:[]];
  if(sql.includes('SELECT GeneratedOn')) return [history];
  if(sql.includes('SELECT * FROM MobileOTPHistory')) return [record?[record]:[]];
  writes.push({sql,args}); return [{affectedRows:1}];
 };
 const db={execute,transaction:work=>work({execute})};
 return {service:new AuthService(db,{encrypt, decrypt}),writes};
}
test('OTP request requires a registered mobile number and validates input',async()=>{
 const {service,writes}=fixture({user:false});
 await assert.rejects(service.requestOtp({body:{mobileNumber:'9876543210'}}),/not registered/);
 await assert.rejects(service.requestOtp({body:{mobileNumber:'abc'}})); assert.equal(writes.length,0);
});
test('sending disabled stores a readable six-digit OTP without returning it to the client',async()=>{
 const {service,writes}=fixture(); const result=await service.requestOtp({body:{mobileNumber:'9876543210'}});
 assert.equal(result.deliveryEnabled,false); assert.equal(result.otp,undefined);
 const insert=writes.find(x=>x.sql.startsWith('INSERT')); assert.equal(insert.args[2],'9876543210');
 assert.match(insert.args[3],/^\d{6}$/);
 assert.ok(writes.every(x=>!x.sql.includes('OTPGenerated=JSON_OBJECT()')));
 assert.equal(insert.args.length,5); assert.ok(insert.args[4] instanceof Date); assert.ok(!insert.sql.includes('otp_hash'));
});
test('OTP resend cooldown, daily limit and missing provider credentials prevent writes',async()=>{
 for(const options of [{history:[{GeneratedOn:new Date()}]},{history:Array(5).fill({GeneratedOn:new Date(0)})},{enabled:'true'}]) {
  const {service,writes}=fixture(options); await assert.rejects(service.requestOtp({body:{mobileNumber:'9876543210'}})); assert.equal(writes.length,0);
 }
});
test('wrong OTP attempts commit; valid OTP authorizes PIN setup once',async()=>{
 const record={OTPGenerated:123456,ExpiredOTPOn:new Date(Date.now()+120000),attempts:0};
 const {service,writes}=fixture({record});
 await assert.rejects(service.verifyOtp({body:{guid,otp:'000000',fullName:'Farmer'}}),/Invalid/);
 assert.ok(writes.some(x=>x.sql.includes('attempts=attempts+1')));
 await service.verifyOtp({body:{guid,otp:'123456',fullName:'Farmer'}});
 assert.ok(writes.some(x=>x.sql.includes('verified_at=NOW')));
 for(const extra of [{consumed_at:new Date()},{verified_at:new Date()},{attempts:5},{ExpiredOTPOn:new Date(0)}]) {
  const f=fixture({record:{...record,...extra}}); await assert.rejects(f.service.verifyOtp({body:{guid,otp:'123456',fullName:'Farmer'}})); assert.equal(f.writes.length,0);
 }
});
test('PIN completion rejects unverified, consumed and expired challenges and legacy credentials',async()=>{
 for(const record of [undefined,{ExpiredOTPOn:new Date(Date.now()+10000)},{verified_at:new Date(),consumed_at:new Date(),ExpiredOTPOn:new Date(Date.now()+10000)},{verified_at:new Date(),ExpiredOTPOn:new Date(0)}]) {
  const {service,writes}=fixture({record}); await assert.rejects(service.login({body:{guid,pin:'1234'}})); assert.equal(writes.length,0);
 }
 const {service}=fixture(); await assert.rejects(service.login({body:{email:'a@example.com',password:'old-password'}}));
});
test('PIN completion saves the verified name and hashed PIN, consumes proof and revokes sessions',async()=>{
 const writes=[]; const proof={user_id:7,MobileNumber:'9876543210',full_name:'Verified Farmer',verified_at:new Date(),ExpiredOTPOn:new Date(Date.now()+60000)};
 const execute=async(sql,args)=>{
  if(sql.includes('FROM MobileOTPHistory')) return [[proof]];
  if(sql.includes('SELECT * FROM users')) return [[{id:7,email:'legacy@example.com',role:'USER',user_details:{}}]];
  if(sql.startsWith('SELECT')) return [[]];
  writes.push({sql,args});return [{affectedRows:1}];
 };
 const service=new AuthService({execute,transaction:work=>work({execute})},{issueTokens:()=>({accessToken:'access',refreshToken:'refresh'}),sha256:()=> 'hash'});
 const result=await service.login({body:{guid,pin:'1234',language:'te'},ip:'127.0.0.1',get:()=> 'test'});
 assert.equal(result.user.fullName,'Verified Farmer'); assert.equal(result.tokens.accessToken,'access');
 const update=writes.find(x=>x.sql.includes('pin_hash=?')); assert.equal(update.args[0],'Verified Farmer'); assert.ok(await argon2.verify(update.args[1],'1234'));
 assert.ok(writes.every(x=>!x.sql.includes('OTPGenerated=JSON_OBJECT()')));
 assert.ok(writes.some(x=>x.sql.includes('consumed_at=NOW'))); assert.ok(writes.some(x=>x.sql.includes('revoked_at=NOW')));
});
test('MSG91 uses database secrets over values and the reference Flow payload',async()=>{
 const previous=globalThis.fetch; let payload;
 globalThis.fetch=async(url,options)=>{assert.equal(String(url),'https://control.msg91.com/api/v5/flow');assert.equal(options.headers.authkey,'secret');payload=JSON.parse(options.body);return {ok:true,json:async()=>({type:'success'})};};
 try {
  const execute=async(sql,args)=>{
   if(sql.includes('FROM ConfigValues')) return [[...Object.entries({OTP_SEND_ENABLED:'true',SMS_PROVIDER:'msg91',MSG91_AUTH_KEY:'wrong',MSG91_OTP_TEMPLATE_ID:'template'}).map(([ConfigKey,ConfigValue])=>({ConfigKey,ConfigValue}))]];
   if(sql.includes('FROM ConfigSecrets')) return [[{ConfigKey:'MSG91_AUTH_KEY',ConfigValue:'secret'}]];
   if(sql.includes('SELECT id FROM users')) return [[{id:7}]];
   if(sql.includes('SELECT GeneratedOn')) return [[]];return [{affectedRows:1}];
  };
  const service=new AuthService({execute,transaction:work=>work({execute})},{encrypt:()=>({encrypted:Buffer.from('cipher'),iv:'iv',tag:'tag'})});
  await service.requestOtp({body:{mobileNumber:'9876543210'}});
  assert.equal(payload.template_id,'template');assert.equal(payload.recipients[0].mobiles,'919876543210');assert.match(payload.recipients[0].var,/^\d{6}$/);
 } finally {globalThis.fetch=previous;}
});
