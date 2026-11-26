export function assetSeries(wallets,entries,asset,start,end,mode='balance') {
  const selected=wallets.filter(w=>w.asset===asset),ids=new Set(selected.map(w=>w.id));
  const all=entries.filter(e=>ids.has(e.wallet_id)),current=selected.reduce((s,w)=>s+BigInt(w.balance),0n);
  const future=all.filter(e=>e.date>end).reduce((s,e)=>s+BigInt(e.units),0n);
  const period=all.filter(e=>e.date>=start&&e.date<=end);
  const opening=mode==='growth'?0n:current-future-period.reduce((s,e)=>s+BigInt(e.units),0n);
  const byDay=new Map();
  for(const e of period) if(mode==='balance'||(e.original_kind||e.kind)==='growth') byDay.set(e.date,(byDay.get(e.date)||0n)+BigInt(e.units));
  const dates=[...new Set([start,...byDay.keys(),end])].sort(); let total=opening;
  const points=dates.map(date=>{total+=byDay.get(date)||0n;return {date,units:total.toString()};});
  return {opening:opening.toString(),closing:total.toString(),change:(total-opening).toString(),count:period.length,points};
}
