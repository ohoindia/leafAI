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
  if(sql.includes('FROM users WHERE mobile_number=')) return [user?[{id:7,is_active:1}]:[]];
  if(sql.startsWith('INSERT INTO users')) { writes.push({sql,args}); return [{insertId:7,affectedRows:1}]; }
  if(sql.includes('SELECT GeneratedOn')) return [history];
  if(sql.includes('SELECT * FROM MobileOTPHistory')) return [record?[record]:[]];
  writes.push({sql,args}); return [{affectedRows:1}];
 };
 const db={execute,transaction:work=>work({execute})};
 return {service:new AuthService(db,{encrypt, decrypt}),writes};
}
test('new mobile number creates a pending user and requires OTP verification',async()=>{
 const {service,writes}=fixture({user:false});
 await service.requestOtp({body:{mobileNumber:'9876543210'}});
 assert.ok(writes.some(x=>x.sql.startsWith('INSERT INTO users')));
 assert.ok(writes.some(x=>x.sql.startsWith('INSERT INTO MobileOTPHistory')));
 await assert.rejects(service.requestOtp({body:{mobileNumber:'abc'}}));
});
test('sending disabled returns the same generated test OTP stored in the table',async()=>{
 const {service,writes}=fixture(); const result=await service.requestOtp({body:{mobileNumber:'9876543210'}});
 assert.equal(result.deliveryEnabled,false); assert.match(result.testOtp,/^\d{6}$/);
 const insert=writes.find(x=>x.sql.startsWith('INSERT')); assert.equal(insert.args[2],'9876543210'); assert.equal(result.testOtp,insert.args[3]);
 assert.match(insert.args[3],/^\d{6}$/);
 assert.ok(writes.every(x=>!x.sql.includes('OTPGenerated=JSON_OBJECT()')));
 assert.equal(insert.args.length,6); assert.ok(insert.args[4] instanceof Date); assert.ok(!insert.sql.includes('otp_hash'));
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
   if(sql.includes('FROM users WHERE mobile_number=')) return [[{id:7,is_active:1}]];
   if(sql.includes('SELECT GeneratedOn')) return [[]];return [{affectedRows:1}];
  };
  const service=new AuthService({execute,transaction:work=>work({execute})},{encrypt:()=>({encrypted:Buffer.from('cipher'),iv:'iv',tag:'tag'})});
  const result=await service.requestOtp({body:{mobileNumber:'9876543210'}});
  assert.equal(result.testOtp,undefined);
  assert.equal(payload.template_id,'template');assert.equal(payload.recipients[0].mobiles,'919876543210');assert.match(payload.recipients[0].var,/^\d{6}$/);
 } finally {globalThis.fetch=previous;}
});
test('mobile lookup chooses PIN only for active completed verified profiles',async()=>{
 for(const [user,expected] of [[undefined,'REQUEST_OTP'],[{id:7,is_active:1},'REQUEST_OTP'],[{id:7,is_active:1,pin_hash:'hash'},'REQUEST_OTP'],[{id:7,is_active:1,pin_hash:'hash',mobile_verified_at:new Date(0)},'PIN_LOGIN']]) {
  const service=new AuthService({execute:async(sql,args)=>{assert.ok(sql.includes('WHERE mobile_number=?'));assert.deepEqual(args,['9876543210']);return [user?[user]:[]];}},{});
  const result=await service.checkMobile({body:{mobileNumber:'9876543210'}});assert.equal(result.nextAction,expected);
 }
 const inactive=new AuthService({execute:async()=>[[{id:7,is_active:0,pin_hash:'hash',mobile_verified_at:new Date()}]]},{});
 await assert.rejects(inactive.checkMobile({body:{mobileNumber:'9876543210'}}),/inactive/);
});
test('completed profile signs in using its existing PIN without OTP or profile changes',async()=>{
 const pinHash=await argon2.hash('1234');const writes=[];
 const user={id:7,is_active:1,mobile_number:'9876543210',mobile_verified_at:new Date(0),pin_hash:pinHash,full_name:'Existing Farmer',email:null,role:'USER',preferred_language:'te'};
 const execute=async(sql,args)=>{assert.ok(!sql.includes('MobileOTPHistory'));if(sql.startsWith('SELECT * FROM users'))return [[user]];if(sql.startsWith('SELECT'))return [[]];writes.push({sql,args});return [{affectedRows:1}];};
 const service=new AuthService({execute,transaction:work=>work({execute})},{issueTokens:()=>({accessToken:'access',refreshToken:'refresh'}),sha256:()=> 'hash'});
 const result=await service.login({body:{mobileNumber:'9876543210',pin:'1234'},ip:'127.0.0.1',get:()=> 'test'});
 assert.equal(result.user.fullName,'Existing Farmer');assert.equal(result.user.language,'te');assert.ok(writes.every(x=>!x.sql.includes('pin_hash=?')));
});
test('wrong PIN persists attempt count and lockout; incomplete and inactive accounts cannot use PIN',async()=>{
 const pinHash=await argon2.hash('1234');
 for(const extra of [{failed_login_count:4},{mobile_verified_at:null},{is_active:0},{locked_until:new Date(Date.now()+60000)}]) {
  const writes=[];const user={id:7,is_active:1,mobile_verified_at:new Date(),pin_hash:pinHash,...extra};
  const execute=async(sql,args)=>{if(sql.startsWith('SELECT'))return [[user]];writes.push({sql,args});return [{affectedRows:1}];};
  const service=new AuthService({transaction:work=>work({execute})},{});
  await assert.rejects(service.login({body:{mobileNumber:'9876543210',pin:'0000'}}),/Invalid PIN/);
  if(extra.failed_login_count===4){assert.equal(writes[0].args[0],5);assert.ok(writes[0].sql.includes('INTERVAL 15 MINUTE'));}else assert.equal(writes.length,0);
 }
});
test('completed users must explicitly request PIN recovery to receive OTP',async()=>{
 const user={id:7,is_active:1,pin_hash:'hash',mobile_verified_at:new Date()};const writes=[];
 const execute=async(sql,args)=>{
  if(sql.includes('FROM ConfigValues'))return [[{ConfigKey:'OTP_SEND_ENABLED',ConfigValue:'false'}]];
  if(sql.includes('FROM ConfigSecrets')||sql.includes('SELECT GeneratedOn'))return [[]];
  if(sql.includes('FROM users'))return [[user]];
  writes.push({sql,args});return [{affectedRows:1}];
 };
 const service=new AuthService({execute,transaction:work=>work({execute})},{});
 await assert.rejects(service.requestOtp({body:{mobileNumber:'9876543210'}}),/Sign in with your PIN/);assert.equal(writes.length,0);
 await service.requestOtp({body:{mobileNumber:'9876543210',resetPin:true}});
 assert.equal(writes.find(x=>x.sql.startsWith('INSERT INTO MobileOTPHistory')).args[5],'PIN_RESET');
});
test('OTP recovery preserves the saved name after verifying the code',async()=>{
 const writes=[];const record={user_id:7,OTPGenerated:123456,purpose:'PIN_RESET',ExpiredOTPOn:new Date(Date.now()+60000),attempts:0};
 const execute=async(sql,args)=>{if(sql.includes('FROM MobileOTPHistory'))return [[record]];if(sql.includes('SELECT full_name'))return [[{full_name:'Saved Name'}]];writes.push({sql,args});return [{affectedRows:1}];};
 const service=new AuthService({transaction:work=>work({execute})},{});
 await service.verifyOtp({body:{guid,otp:'123456'}});
 assert.equal(writes.find(x=>x.sql.includes('verified_at=NOW')).args[0],'Saved Name');
});
