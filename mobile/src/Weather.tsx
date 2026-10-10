import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
import { endpoints } from "../../common/api.js";
import { condition, dayLabel, formatValue, forecastSummary, weatherMetrics, weatherQuery, type WeatherData, type WeatherPlace, type WeatherPeriod } from "../../common/weather.js";
import { useLeafCare } from "./state";
import { useLocale } from "./locale";
import { request } from "./api";
import { Button, Card, Field, s } from "./ui";
function Metrics({ record, units }: { record: Record<string,unknown>; units: Record<string,string> }) {
 const localize = useLocale();
 return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{weatherMetrics(record,units).map(metric=><View key={metric.key} style={{ width: "48%", backgroundColor: "#f8fafc", padding: 10, borderRadius: 10 }}><Text style={s.muted}>{localize(metric.label)}</Text><Text style={[s.body,{fontWeight:"600"}]}>{localize(metric.value)}</Text></View>)}</View>;
}
function Expand({ title, children }: { title: string; children: React.ReactNode }) {
 const [open,setOpen]=useState(false);
 return <View style={{ gap:12, borderTopWidth:1, borderTopColor:"#e0e9ef", paddingTop:8 }}><Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)} style={{minHeight:48,justifyContent:"center"}}><Text style={[s.body,{fontWeight:"600"}]}>{title} {open?"-":"+"}</Text></Pressable>{open&&children}</View>;
}
export function Weather({ summary = false }: { summary?: boolean }) {
 const a=useLeafCare();const localize=useLocale();
 const [data,setData]=useState<WeatherData>(),[busy,setBusy]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState(""),[places,setPlaces]=useState<WeatherPlace[]>([]);
 const place=useRef<WeatherPlace|null>(null),sequence=useRef(0);
 async function load(selected=place.current) {
  const id=++sequence.current;setBusy(true);setError("");setData(undefined);place.current=selected;
  try {const result=await request<WeatherData>(endpoints.weather+weatherQuery(selected||undefined),a.token);if(id===sequence.current)setData(result);}
  catch(e){if(id===sequence.current)setError(e instanceof Error?e.message:"Unable to load weather.");}
  finally{if(id===sequence.current)setBusy(false);}
 }
 useEffect(()=> {
  let active=true; const id=++sequence.current;
  void request<WeatherData>(endpoints.weather,a.token)
    .then(result=>{if(active&&id===sequence.current)setData(result);})
    .catch(e=>{if(active&&id===sequence.current)setError(e instanceof Error?e.message:"Unable to load weather.");})
    .finally(()=>{if(active&&id===sequence.current)setBusy(false);});
  return()=>{active=false;};
 },[a.token]);
 async function search() {
  if(query.trim().length<2){setError("Enter at least two characters to search.");return;}
  const id=++sequence.current;setBusy(true);setError("");setPlaces([]);
  try{const results=await request<WeatherPlace[]>(`${endpoints.weatherLocations}?q=${encodeURIComponent(query.trim())}`,a.token);if(id===sequence.current){setPlaces(results);if(!results.length)setError("No matching places. Try a nearby town.");}}
  catch(e){if(id===sequence.current)setError(e instanceof Error?e.message:"Location search failed.");}finally{if(id===sequence.current)setBusy(false);}
 }
 async function locate() {
  const id=++sequence.current;setBusy(true);setError("");
  try {
   const permission=await Location.requestForegroundPermissionsAsync();
   if(permission.status!=="granted")throw new Error("Allow location access or search for your town.");
   let timeout: ReturnType<typeof setTimeout>|undefined;
   const position=await Promise.race([Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error("Location timed out. Search for your town instead.")),15000);})]).finally(()=>clearTimeout(timeout));
   if(id===sequence.current)await load({latitude:position.coords.latitude,longitude:position.coords.longitude});
  } catch(e) {if(id===sequence.current){setError(e instanceof Error?e.message:"Could not get your location.");setBusy(false);}}
 }
 const extra=data?Object.fromEntries(Object.entries(data.currentExtra).filter(([key])=>["soil_temperature_0cm","soil_temperature_6cm","soil_moisture_0_to_1cm","soil_moisture_3_to_9cm","uv_index","visibility","dew_point_2m","et0_fao_evapotranspiration"].includes(key))):{};
 if (summary) return <Card>
  <View style={{gap:4}}><Text style={s.heading}>{localize("Five-day outlook")}</Text>{data && <Text style={[s.muted,{fontWeight:"600"}]}>{data.location.label}</Text>}</View>
  {busy && <Text accessibilityLiveRegion="polite" style={s.muted}>{localize("Loading weather...")}</Text>}{!!error && <Text accessibilityRole="alert" style={s.error}>{localize(error)}</Text>}
  {data && <>
   <View style={{flexDirection:"row",flexWrap:"wrap",gap:6}}>{forecastSummary(data.days, a.lang).map(text => <View key={text} style={{flexGrow:1,flexBasis:"45%",padding:8,borderRadius:8,backgroundColor:"#f4f8fa"}}><Text style={[s.muted,{fontSize:13,lineHeight:18}]}>{text}</Text></View>)}</View>
   <View style={{gap:6}}>{data.days.slice(1, 6).map(day => <View key={day.time} style={{flexDirection:"row",alignItems:"center",flexWrap:"wrap",gap:8,padding:10,borderRadius:10,backgroundColor:"#edf8ff"}}>
    <View style={{flexGrow:1,flexShrink:1,flexBasis:110,gap:2}}><Text style={[s.body,{fontSize:14,lineHeight:20,fontWeight:"600"}]}>{dayLabel(day.time, a.lang)}</Text><Text style={[s.muted,{fontSize:12,lineHeight:17}]}>{localize(condition(day.weather_code))}</Text></View>
    <View style={{flexShrink:1,gap:2,alignItems:"flex-end"}}><Text style={[s.body,{fontSize:14,lineHeight:20,fontWeight:"600"}]}>{localize(formatValue(day.temperature_2m_max, "\u00b0C"))} / {localize(formatValue(day.temperature_2m_min, "\u00b0C"))}</Text><Text style={[s.muted,{fontSize:12,lineHeight:17}]}>{localize("Rain chance")} {localize(formatValue(day.precipitation_probability_max, "%"))}</Text></View>
   </View>)}</View>
  </>}
  <Button secondary title={localize("View all weather")} onPress={() => a.go("weather")} />
 </Card>;
 return <Card title={localize("Local weather")}>
  <Text style={s.muted}>{localize("Plan your next five days")}</Text>
  <Field value={query} onChangeText={setQuery} maxLength={100} placeholder={localize("Town, city or postal code")} accessibilityLabel={localize("Find your town or village")} onSubmitEditing={()=>void search()}/>
  <Button title={localize("Search")} disabled={busy} onPress={()=>void search()}/>
  <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}><Button secondary title={localize("Use my location")} disabled={busy} onPress={()=>void locate()}/><Button secondary title={localize("Saved farm")} disabled={busy} onPress={()=>void load(null)}/></View>
  {places.map(p=><Button secondary key={`${p.latitude},${p.longitude}`} title={p.label||"Location"} disabled={busy} onPress={()=>{setPlaces([]);void load(p);}}/>)}
  {busy&&<Text accessibilityLiveRegion="polite" style={s.muted}>{localize("Loading weather...")}</Text>}{!!error&&<Text accessibilityRole="alert" style={{color:"#b42318"}}>{localize(error)}</Text>}
  {data&&<>
   <View style={{backgroundColor:"#edf8ff",borderRadius:16,padding:16,gap:8}}><Text style={s.heading}>{data.location.label}</Text><Text style={s.muted}>{localize(data.location.source||"")} · {data.location.latitude.toFixed(3)}, {data.location.longitude.toFixed(3)}</Text><Text style={[s.title,{fontSize:40,color:"#005e80"}]}>{formatValue(data.current.temperature_2m,"°C")}</Text><Text style={s.heading}>{localize(condition(data.current.weather_code))}</Text><Text style={s.body}>{localize("Feels like")} {formatValue(data.current.apparent_temperature,"°C")}</Text><Text style={s.muted}>{localize("Conditions at")} {data.current.time.replace("T"," ")} ({data.timezone})</Text></View>
   <Button secondary title={localize("Refresh")} disabled={busy} onPress={()=>void load()}/>
   <Metrics record={Object.fromEntries(Object.entries(data.current).filter(([key])=>["relative_humidity_2m","wind_speed_10m","wind_gusts_10m","precipitation"].includes(key)))} units={data.units.current}/>
   <Expand title={localize("All current weather details")}><Metrics record={data.current} units={data.units.current}/><Text style={s.heading}>{localize("Hourly soil, UV and visibility estimates")}</Text><Text style={s.muted}>{data.currentExtra.time.replace("T"," ")}</Text><Metrics record={extra} units={data.units.hourly}/></Expand>
   <Text style={s.heading}>{localize("Five-day outlook")}</Text>{forecastSummary(data.days, a.lang).map(text=><Text key={text} style={s.body}>{localize(text)}</Text>)}
   <Text style={s.heading}>{localize("Today and the next five days")}</Text>
   {data.days.map((day,index)=><Expand key={day.time} title={`${index===0?localize("Today"):dayLabel(day.time,a.lang)} · ${localize(condition(day.weather_code))}\n${formatValue(day.temperature_2m_max,"°C")} / ${formatValue(day.temperature_2m_min,"°C")} · ${localize("Rain chance")} ${formatValue(day.precipitation_probability_max,"%")}`}><Metrics record={day} units={data.units.daily}/><Expand title={localize("Hour-by-hour forecast")}>{day.hours.map((hour:WeatherPeriod)=><Expand key={hour.time} title={`${hour.time.slice(11,16)} · ${localize(condition(hour.weather_code))} · ${formatValue(hour.temperature_2m,"°C")}\n${localize("Rain chance")} ${formatValue(hour.precipitation_probability,"%")}`}><Metrics record={hour} units={data.units.hourly}/></Expand>)}</Expand></Expand>)}
   <Text style={s.muted}>{localize(data.modelNote)}</Text><Text style={s.muted}>{localize("Retrieved")} {new Date(data.fetchedAt).toLocaleString("en-IN",{timeZone:data.timezone})}</Text><Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(data.attributionUrl)}><Text style={s.small}>{localize("Weather data by")} {data.attribution}</Text></Pressable>
  </>}
 </Card>;
}
