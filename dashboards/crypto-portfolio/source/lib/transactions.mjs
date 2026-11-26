import {SCALE,decimal,formatUnits,precision,growth,validDate,clean,fail} from './model.mjs';
const unit=asset=>10n**BigInt(18-(precision[asset]??8));
export function calculateFee(amount,percent,fixed,asset){
 const pct=decimal(percent===''||percent==null?'0':percent,6),add=decimal(fixed===''||fixed==null?'0':fixed,precision[asset]??8);
 if(pct>100n*SCALE)fail('Комиссия не может превышать 100%.');
 const denominator=100n*SCALE,quantum=unit(asset),numerator=BigInt(amount)*pct;
 // Round the percentage part up to the smallest supported accounting unit.
 const proportional=(numerator+denominator*quantum-1n)/(denominator*quantum)*quantum;
 return proportional+add;
}
export function requestSignature(body){const keys=['profileId','walletId','targetWalletId','type','mode','amount','percent','feePercent','feeFixed','rate','date','note','entryId'];return JSON.stringify(Object.fromEntries(keys.map(k=>[k,String(body[k]??'')])));}
export function planTransaction(wallets,b){
 const profileId=clean(b.profileId,100),id=clean(b.requestId,100),date=validDate(b.date),note=clean(b.note,500),w=wallets.find(w=>w.id===b.walletId&&w.profile_id===profileId);
 if(!w)fail('Счёт не найден в выбранном портфеле.');
 if(!Number.isInteger(b.expectedVersion)||b.expectedVersion!==w.version)fail('Остаток изменился. Обновите данные.',409);
 if(date<w.last_date)fail('Дата раньше последней операции на счёте.');
 if(!['deposit','withdrawal','growth','exchange'].includes(b.type))fail('Неизвестный тип операции.');
 const amount=b.type==='growth'&&b.mode==='percent'?growth(w.balance,b.percent,w.asset):decimal(b.amount,precision[w.asset]??8);
 if(amount<=0n)fail('Сумма после округления должна быть больше нуля.');
 const steps=[],details={type:b.type,amount:formatUnits(amount),sourceAsset:w.asset,feePercent:String(b.feePercent||'0'),feeFixed:String(b.feeFixed||'0')};
 const add=(wallet,kind,value,suffix)=>steps.push({id:id+suffix,wallet_id:wallet.id,kind,units:value.toString(),date,note,group_id:id,percent:b.type==='growth'&&b.mode==='percent'?String(b.percent):null,base_units:b.type==='growth'&&b.mode==='percent'?w.balance:null});
 if(b.type==='exchange'){
  const to=wallets.find(x=>x.id===b.targetWalletId&&x.profile_id===profileId);if(!to)fail('Выберите счёт получения в этом портфеле.');
  if(to.asset===w.asset)fail('Обмен нужен для разных активов.');
  if(!Number.isInteger(b.targetExpectedVersion)||b.targetExpectedVersion!==to.version)fail('Остаток счёта получения изменился. Обновите данные.',409);
  if(date<to.last_date)fail('Дата раньше последней операции на счёте получения.');
  const rate=decimal(b.rate);if(rate<=0n)fail('Курс должен быть больше нуля.');
  const quantum=unit(to.asset),gross=amount*rate/SCALE/quantum*quantum,fee=calculateFee(gross,b.feePercent??'0.08',b.feeFixed,to.asset);
  if(gross<=0n||fee>=gross)fail('Сумма получения после комиссии должна быть больше нуля.');
  add(w,'exchange_out',-amount,'');add(to,'exchange_in',gross,':in');if(fee)add(to,'fee',-fee,':fee');
  Object.assign(details,{targetAsset:to.asset,rate:formatUnits(rate),gross:formatUnits(gross),net:formatUnits(gross-fee),fee:formatUnits(fee),feeAsset:to.asset,feePercent:String(b.feePercent??'0.08')});
 }else if(b.type==='growth'){add(w,'growth',amount,'');Object.assign(details,{fee:'0',feeAsset:w.asset,net:formatUnits(amount)});}
 else{
  const fee=calculateFee(amount,b.feePercent,b.feeFixed,w.asset);if(b.type==='deposit'&&fee>=amount)fail('Комиссия должна быть меньше суммы входа.');
  add(w,b.type,b.type==='withdrawal'?-amount:amount,'');if(fee)add(w,'fee',-fee,':fee');Object.assign(details,{fee:formatUnits(fee),feeAsset:w.asset,net:formatUnits(b.type==='deposit'?amount-fee:amount+fee)});
 }
 const touched=[...new Set(steps.map(e=>e.wallet_id))].map(walletId=>{const wallet=wallets.find(w=>w.id===walletId),change=steps.filter(e=>e.wallet_id===walletId).reduce((s,e)=>s+BigInt(e.units),0n),balance=BigInt(wallet.balance)+change;if(balance<0n)fail('Недостаточно учётного остатка с учётом комиссии.');return {...wallet,balance:balance.toString(),initialVersion:wallet.version,last_date:date};});
 steps[0].meta=JSON.stringify({signature:requestSignature(b),...details});
 return {id,profileId,date,note,steps,touched,details};
}
