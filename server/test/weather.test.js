import assert from 'node:assert/strict';
import {test} from 'node:test';
Object.assign(process.env,{NODE_ENV:'test',DB_HOST:'localhost',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',OPENAI_API_KEY:'test',JWT_ACCESS_SECRET:'a'.repeat(32),JWT_REFRESH_SECRET:'b'.repeat(32),UPLOAD_ENCRYPTION_KEY:'c'.repeat(64)});
const {WeatherService}=await import('../dist/weather/weather.service.js');
const {condition,formatValue,forecastSummary,dayLabel}=await import('../../common/weather.js');
function provider() {
 const times=Array.from({length:6},(_,i)=>`2026-10-${10+i}`);
 return {timezone:'Asia/Kolkata',current:{time:times[0]+'T10:15',temperature_2m:28,weather_code:0},current_units:{temperature_2m:'°C'},daily:{time:times,temperature_2m_max:[30,31,32,33,34,35],precipitation_sum:[90,1,2,3,4,5]},daily_units:{precipitation_sum:'mm'},hourly:{time:times.flatMap(d=>[d+'T09:00',d+'T10:00']),temperature_2m:Array(12).fill(28),relative_humidity_2m:Array(12).fill(null)},hourly_units:{temperature_2m:'°C'}};
}
const req=query=>({query,user:{sub:'7'}});
test('weather validates coordinate pairs and rejects missing saved locations without upstream calls',async()=>{
 let calls=0;const service=new WeatherService({execute:async()=>{calls++;return [[]];}});
 for(const query of [{latitude:'17'},{latitude:'',longitude:'78'},{latitude:'91',longitude:'78'},{latitude:'abc',longitude:'78'}])await assert.rejects(service.forecast(req(query)));
 assert.equal(calls,0);await assert.rejects(service.forecast(req({})),/Choose a location/);
});
test('forecast includes today plus five days, groups hours and caches coordinates without leaking labels',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url)=>{calls++;assert.equal(url.searchParams.get('forecast_days'),'6');assert.equal(url.searchParams.get('timezone'),'auto');return {ok:true,json:async()=>provider()};};
 try{const service=new WeatherService({execute:async()=>[[]]});const first=await service.forecast(req({latitude:'17.385',longitude:'78.4867',label:'Farm A'}));const second=await service.forecast(req({latitude:'17.385',longitude:'78.4867',label:'Farm B'}));assert.equal(first.days.length,6);assert.equal(first.days[0].hours.length,2);assert.equal(first.currentExtra.time,'2026-10-10T10:00');assert.equal(first.days[0].hours[0].relative_humidity_2m,null);assert.equal(second.location.label,'Farm B');assert.equal(calls,1);}finally{globalThis.fetch=previous;}
});
test('saved farm lookup is owner scoped and preserves zero coordinates',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>provider()});
 try{const service=new WeatherService({execute:async(sql,args)=>{if(sql.includes('FarmDetails')){assert.deepEqual(args,['7']);return [[{latitude:0,longitude:0,farm_name:'Zero Farm'}]];}return [[]];}});const data=await service.forecast(req({}));assert.equal(data.location.latitude,0);assert.equal(data.location.source,'Saved farm coordinates');}finally{globalThis.fetch=previous;}
});
test('ambiguous saved address requires explicit place selection',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({results:[{name:'Village',latitude:1,longitude:2},{name:'Village',latitude:3,longitude:4}]})});
 try{const service=new WeatherService({execute:async(sql)=>sql.includes('FarmDetails')?[[{village:'Village'}]]:[[]]});await assert.rejects(service.forecast(req({})),/Select your town/);}finally{globalThis.fetch=previous;}
});
test('provider failures and incomplete responses become recoverable weather errors',async()=>{
 const previous=globalThis.fetch;try{for(const result of [{ok:false},{ok:true,json:async()=>({})},{ok:true,json:async()=>({...provider(),hourly:{time:[]}})}]){globalThis.fetch=async()=>result;const service=new WeatherService({execute:async()=>[[]]});await assert.rejects(service.forecast(req({latitude:'17',longitude:'78'})),/unavailable|incomplete/);}}finally{globalThis.fetch=previous;}
});
test('paid forecast keys stay server side and switch to customer endpoint',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async(url)=>{assert.equal(url.hostname,'customer-api.open-meteo.com');assert.equal(url.searchParams.get('apikey'),'paid-key');return {ok:true,json:async()=>provider()};};
 try{const service=new WeatherService({execute:async()=>[[{ConfigValue:'paid-key'}]]});const data=await service.forecast(req({latitude:'17',longitude:'78'}));assert.ok(!JSON.stringify(data).includes('paid-key'));}finally{globalThis.fetch=previous;}
});
test('forecast summary excludes today and missing values; units preserve zero and soil precision',()=>{
 const raw=provider();const days=raw.daily.time.map((time,i)=>({time,precipitation_sum:raw.daily.precipitation_sum[i],temperature_2m_max:raw.daily.temperature_2m_max[i],hours:[]}));assert.match(forecastSummary(days)[0],/15.0 mm/);assert.equal(formatValue(0,'%'),'0 %');assert.equal(formatValue(null,'°C'),'Unavailable');assert.equal(formatValue(0.123,'m³/m³','soil_moisture_0_to_1cm'),'0.123 m³/m³');assert.equal(formatValue(3600,'s'),'1.0 h');assert.equal(condition(95),'Thunderstorm');assert.match(dayLabel('2026-10-10'),/10/);
});
