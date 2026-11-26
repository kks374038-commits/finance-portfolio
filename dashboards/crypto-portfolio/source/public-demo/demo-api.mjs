// Public, browser-only sandbox. No authentication, server, real accounts or network requests.
import {SCALE,decimal,formatUnits,growth,networkDefaults,precision,today,validDate} from '../lib/model.mjs';
import {popularAssets} from '../lib/assets.mjs';
const key='ks-crypto-public-demo-v2';
const uid=()=>crypto.randomUUID();
const past=n=>{const d=new Date(today()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10);};
function seed(){
 const profile={id:'example',name:'Демонстрационный портфель',viewer_email:'',created_at:new Date().toISOString()},wallets=[],entries=[];
 const amounts=['0.1','2','5000','1','1000','2000','10','1000','10000','2000'];
 popularAssets.forEach((asset,i)=>{const w={id:uid(),profile_id:profile.id,label:asset.name,asset:asset.symbol,network:asset.network,balance:'0',version:0,price_usd:null,price_date:null,last_date:''};
  function add(kind,amount,date,note){const units=decimal(amount,precision[w.asset]??8)*(kind==='withdrawal'?-1n:1n);w.balance=(BigInt(w.balance)+units).toString();w.version++;w.last_date=date;entries.unshift({id:uid(),profile_id:profile.id,wallet_id:w.id,kind,units:units.toString(),date,note,actor:'Демонстрация',created_at:new Date().toISOString()});}
  add('deposit',amounts[i],past(24),'Пример пополнения · синтетические данные');
  add('growth',formatUnits(growth(w.balance,'2',w.asset)),past(17),'Пример ручного начисления 2%');
  add('growth',formatUnits(growth(w.balance,'1.5',w.asset)),past(10),'Пример ручного начисления 1,5%');
  add('deposit',formatUnits(decimal(amounts[i])/5n),past(5),'Пример дополнительного пополнения');
  add('growth',formatUnits(growth(w.balance,'1',w.asset)),past(1),'Пример ручного начисления 1%');wallets.push(w);
 });return {profiles:[profile],wallets,entries,audit:[]};
}
function read(){try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d?.wallets&&d?.profiles&&d?.entries)return d;}catch{}return seed();}
let current=read();
const requireValue=(v,message)=>{if(!v)throw Error(message);return v;};
function audit(d,action,detail){d.audit.unshift({id:uid(),actor:'Демо-администратор',action,detail:JSON.stringify(detail),created_at:new Date().toISOString()});}
function postEntry(d,profile,b){
 const w=requireValue(d.wallets.find(w=>w.id===b.walletId&&w.profile_id===profile),'Счёт не найден');
 const id=b.external_id||b.requestId;if(id){const old=d.entries.find(e=>e.profile_id===profile&&e.external_id===id);if(old)return false;}
 const date=validDate(b.date);if(date<w.last_date)throw Error('Дата должна быть не раньше последней операции счёта.');
 if(!['deposit','withdrawal','growth','reversal'].includes(b.type))throw Error('Неизвестный тип операции');
 if(b.expectedVersion!==undefined&&Number(b.expectedVersion)!==w.version)throw Error('Остаток изменился. Обновите страницу.');
 const note=requireValue(String(b.note||'').trim(),'Укажите основание операции.');
 let units=b.type==='reversal'?BigInt(b.reverseUnits):b.type==='growth'&&b.mode==='percent'?growth(w.balance,b.percent,w.asset):decimal(b.amount,precision[w.asset]??8);
 if(b.type!=='reversal'&&units<=0n)throw Error('Сумма должна быть больше нуля.');
 if(b.type==='withdrawal')units=-units;if(BigInt(w.balance)+units<0n)throw Error('Недостаточно учётного остатка.');
 const e={id:uid(),profile_id:profile,wallet_id:w.id,kind:b.type,units:units.toString(),date,note,actor:'Демо-администратор',created_at:new Date().toISOString(),external_id:id||null,reversal_of:b.reversal_of||null,original_kind:b.original_kind||null,percent:b.mode==='percent'?b.percent:null,base_units:b.mode==='percent'?w.balance:null};
 w.balance=(BigInt(w.balance)+units).toString();w.version++;w.last_date=date;d.entries.unshift(e);audit(d,b.type,{wallet:w.label,units:e.units});return true;
}
export async function demoRequest(url,options={}){
 try{
 if(!options.method||options.method==='GET'){const selected=new URL(String(url),'https://demo.invalid').searchParams.get('profileId')||current.profiles[0].id;
  return Response.json({role:'admin',user:'Демонстрационный аккаунт',selected,profiles:current.profiles,wallets:current.wallets.filter(w=>w.profile_id===selected),entries:current.entries.filter(e=>e.profile_id===selected),audit:current.audit.slice(0,100),historyComplete:true});}
 const b=JSON.parse(options.body||'{}'),d=structuredClone(current),profile=b.profileId||d.profiles[0].id;let result={};
 if(b.action==='profile'){const p={id:uid(),name:requireValue(String(b.name||'').trim(),'Укажите название'),viewer_email:'',created_at:new Date().toISOString()};d.profiles.push(p);result.id=p.id;audit(d,'Создание демо-портфеля',{name:p.name});}
 else if(b.action==='wallet'){const symbol=requireValue(b.asset,'Выберите актив'),network=requireValue(String(b.network||'').trim(),'Укажите сеть');d.wallets.push({id:uid(),profile_id:profile,label:requireValue(b.label,'Укажите название'),asset:symbol,network,balance:'0',version:0,price_usd:b.priceUsd?formatUnits(decimal(b.priceUsd)):null,price_date:b.priceUsd?today():null,last_date:''});audit(d,'Создание счёта',{asset:symbol,network});}
 else if(b.action==='price'){const w=requireValue(d.wallets.find(w=>w.id===b.walletId),'Счёт не найден');const p=decimal(b.priceUsd);if(p<=0n)throw Error('Цена должна быть положительной');w.price_usd=formatUnits(p);w.price_date=validDate(b.priceDate);audit(d,'Ручная цена',{wallet:w.label});}
 else if(b.action==='operation')postEntry(d,profile,b);
 else if(b.action==='reverse'){const original=requireValue(d.entries.find(e=>e.id===b.entryId&&e.profile_id===profile),'Операция не найдена');if(original.kind==='reversal'||d.entries.some(e=>e.reversal_of===original.id))throw Error('Операция уже сторнирована');postEntry(d,profile,{...b,type:'reversal',walletId:original.wallet_id,reverseUnits:(-BigInt(original.units)).toString(),reversal_of:original.id,original_kind:original.kind});}
 else if(b.action==='import'){if(!Array.isArray(b.rows)||!b.rows.length||b.rows.length>100)throw Error('Нужно от 1 до 100 строк');let imported=0,skipped=0;for(const row of b.rows){requireValue(row.external_id,'Нужен external_id');if(!['deposit','withdrawal','growth'].includes(row.type))throw Error('Тип: deposit, withdrawal или growth');let w=d.wallets.find(w=>w.profile_id===profile&&w.label===row.wallet&&w.asset===row.asset&&w.network===row.network);if(!w){w={id:uid(),profile_id:profile,label:row.wallet,asset:row.asset,network:row.network,balance:'0',version:0,price_usd:null,price_date:null,last_date:''};d.wallets.push(w);}if(postEntry(d,profile,{...row,walletId:w.id}))imported++;else skipped++;}result={imported,skipped};}
 else throw Error('Действие недоступно в демонстрации');
 localStorage.setItem(key,JSON.stringify(d));current=d;return Response.json(result);
 }catch(error){return Response.json({error:error.message||'Не удалось сохранить'},{status:400});}
}
