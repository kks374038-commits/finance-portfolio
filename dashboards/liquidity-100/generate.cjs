const fs=require('node:fs');
const currencies=[['RUB',1],['USD',92],['EUR',101],['CNY',12.8],['GBP',120],['CHF',105],['JPY',0.61],['HKD',11.8],['SGD',69],['AED',25],['TRY',2.7],['KZT',0.19],['BYN',28],['AMD',0.24],['GEL',34],['UZS',0.0072],['KGS',1.06],['TJS',8.5],['INR',1.1],['IDR',0.0058],['THB',2.7],['VND',0.0037],['KRW',0.068],['AUD',61],['CAD',67],['NZD',56],['SEK',8.9],['NOK',8.6],['DKK',13.5],['PLN',23.5],['CZK',4],['HUF',0.25],['RON',20.2],['BRL',17],['MXN',4.8],['ZAR',5.1],['SAR',24.5],['QAR',25.3],['BHD',244],['ILS',25],['BTC',8500000,8,'Bitcoin'],['ETH',300000,8,'Ethereum'],['USDT',92,6,'TRON'],['USDC',92,6,'Ethereum'],['SOL',15000,8,'Solana'],['TON',480,8,'TON'],['BNB',55000,8,'BNB Chain'],['XRP',100,6,'XRP Ledger'],['LTC',8500,8,'Litecoin'],['ADA',70,6,'Cardano']];
const assets=currencies.map(([code,rate,dec=2,network=''],i)=>({code,dec,network,crypto:i>=40,rateMicro:Math.round(rate*1e6)}));
let seed=43171;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const baseToNative=(cents,a)=>Number(BigInt(cents)*10n**BigInt(a.dec)*10000n/BigInt(a.rateMicro));
const nativeToBase=(units,a)=>Number((BigInt(units)*BigInt(a.rateMicro)+10n**BigInt(a.dec)*5000n)/(10n**BigInt(a.dec)*10000n));
const accounts=assets.flatMap((a,i)=>[0,1].map(j=>({id:`A${String(i*2+j+1).padStart(3,'0')}`,name:a.crypto?`${a.code} · кошелёк ${j+1}`:`${j?'Резервный':'Расчётный'} · ${a.code}`,asset:a.code,entity:['Компания А','Компания Б','Компания В'][i%3],type:a.crypto?'crypto':j?(i%5===0?'cash':'wallet'):'bank',network:a.crypto?(a.code==='USDT'&&j?'Ethereum':a.code==='USDC'&&j?'Solana':a.network):'',opening:baseToNative(Math.round((400000+rnd()*1100000)*100),a),reserve:baseToNative((i%7===0?320000:120000)*100,a),blocked:baseToNative(Math.round(rnd()*35000)*100,a),lastMovementDays:0})));
for(const a of accounts.filter(a=>['A036','A062','A091'].includes(a.id)))a.reserve=baseToNative(1800000*100,assets.find(x=>x.code===a.asset));
const balances=Object.fromEntries(accounts.map(a=>[a.id,a.opening]));const snapshots=[],operations=[];
const idle=new Set(['A009','A018','A035','A046','A061','A080','A092','A098']);
const eligible=accounts.filter(a=>!idle.has(a.id));
const pick=arr=>arr[Math.floor(rnd()*arr.length)];
const dateOf=n=>`2026-11-${19+n}`;
for(let d=0;d<7;d++){
 const date=dateOf(d),opening={...balances};const daily=[];
 const add=(type,from,to,amountOut,amountIn,status='done')=>{const o={id:`OP-${date.slice(5).replace('-','')}-${String(daily.length+1).padStart(3,'0')}`,date,type,from:from?.id??null,to:to?.id??null,amountOut,amountIn,status,reference:`DEMO-${d+1}-${daily.length+1}`};if(from)balances[from.id]-=amountOut;if(to&&status==='done')balances[to.id]+=amountIn;daily.push(o);};
 for(let n=0;n<60;n++){const a=pick(eligible),asset=assets.find(x=>x.code===a.asset);add('receipt',null,a,0,baseToNative(Math.round((3000+rnd()*27000)*100),asset));}
 for(let n=0;n<60;n++){const a=pick(eligible),asset=assets.find(x=>x.code===a.asset);add('payment',a,null,Math.min(Math.floor(balances[a.id]/5),baseToNative(Math.round((2000+rnd()*24000)*100),asset)),0);}
 const pairs=assets.map(asset=>accounts.filter(a=>a.asset===asset.code&&!idle.has(a.id))).filter(p=>p.length===2&&p[0].network===p[1].network);
 for(let n=0;n<40;n++){let [a,b]=pick(pairs);if(rnd()>.5)[a,b]=[b,a];const asset=assets.find(x=>x.code===a.asset),amount=Math.min(Math.floor(balances[a.id]/6),baseToNative(Math.round((6000+rnd()*43000)*100),asset));add('transfer',a,b,amount,amount,n<5?'pending':'done');}
 for(let n=0;n<20;n++){const a=pick(eligible),dest=eligible.filter(x=>x.entity===a.entity&&x.asset!==a.asset),b=pick(dest),as=assets.find(x=>x.code===a.asset),bs=assets.find(x=>x.code===b.asset),out=Math.min(Math.floor(balances[a.id]/8),baseToNative(Math.round((7000+rnd()*35000)*100),as));const base=nativeToBase(out,as),inc=baseToNative(Math.floor(base*998/1000),bs);add('exchange',a,b,out,inc);}
 operations.push(...daily);
 for(let i=0;i<accounts.length;i++){
  const a=accounts[i],asset=assets.find(x=>x.code===a.asset),outs=daily.filter(o=>o.from===a.id).reduce((s,o)=>s+o.amountOut,0),ins=daily.filter(o=>o.to===a.id&&o.status==='done').reduce((s,o)=>s+o.amountIn,0);
  const missing=[5,49].includes(i),stale=[8,16,29,45,58,69,88,96].includes(i),gap=[3,7,11,19,23,31,38,43,54,61,72,83,94].includes(i)?baseToNative((i%2?-1:1)*(11000+i*172)*100,asset):0;
  const observed=balances[a.id]+gap;
  snapshots.push({date,accountId:a.id,opening:opening[a.id],incoming:ins,outgoing:outs,book:balances[a.id],source:missing?null:observed,quality:missing?'missing':stale?'stale':'fresh',age:idle.has(a.id)?8+d:0,rateMicro:a.asset==='BHD'?null:a.asset==='RUB'?1000000:Math.round(asset.rateMicro*(1+(d-6)*0.001)),reserve:a.reserve,blocked:a.blocked});
 }
}
fs.writeFileSync('data.js','window.DEMO_DATA = '+JSON.stringify({asOf:'2026-11-25',assets,accounts,snapshots,operations})+';\n');
fs.writeFileSync('demo-data.json',JSON.stringify({asOf:'2026-11-25',assets,accounts,snapshots,operations}));
console.log(JSON.stringify({accounts:accounts.length,assets:assets.length,operations:operations.length,days:snapshots.length/100}));
