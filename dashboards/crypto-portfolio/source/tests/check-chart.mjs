import assert from 'node:assert/strict';
import {assetSeries} from '../lib/chart.mjs';
import {decimal,formatUnits,precision,networkDefaults} from '../lib/model.mjs';
import {popularAssets} from '../lib/assets.mjs';
let passed=0;function test(name,fn){fn();passed++;console.log('OK '+name);}
const w=(id,asset,balance)=>({id,asset,balance:decimal(balance).toString()});
const op=(wallet_id,date,kind,units,extra={})=>({wallet_id,date,kind,units:units.startsWith('-')?(-decimal(units.slice(1))).toString():decimal(units).toString(),...extra});
const wallets=[w('a','USDT','1450'),w('b','BTC','0.1')],entries=[op('a','2026-11-01','deposit','1000'),op('a','2026-11-10','growth','50'),op('a','2026-11-15','deposit','500'),op('a','2026-11-20','withdrawal','-100'),op('b','2026-11-10','deposit','0.1')];
test('Справочник содержит ровно 10 уникальных активов',()=>assert.equal(new Set(popularAssets.map(a=>a.symbol)).size,10));
test('У каждого популярного актива есть сеть и точность',()=>popularAssets.forEach(a=>{assert.ok(networkDefaults[a.symbol]);assert.ok(precision[a.symbol]>0);}));
test('График баланса совпадает с текущим остатком',()=>assert.equal(formatUnits(assetSeries(wallets,entries,'USDT','2026-11-01','2026-11-26').closing),'1450'));
test('График прироста исключает пополнения и выводы',()=>assert.equal(formatUnits(assetSeries(wallets,entries,'USDT','2026-11-01','2026-11-26','growth').closing),'50'));
test('Активы не смешиваются',()=>assert.equal(formatUnits(assetSeries(wallets,entries,'BTC','2026-11-01','2026-11-26').closing),'0.1'));
test('Начальный остаток периода восстанавливается',()=>assert.equal(formatUnits(assetSeries(wallets,entries,'USDT','2026-11-15','2026-11-26').opening),'1050'));
test('Изменение периода включает отрицательные движения',()=>assert.equal(formatUnits(assetSeries(wallets,entries,'USDT','2026-11-20','2026-11-26').change),'-100'));
test('Сторно начисления уменьшает только прирост',()=>{const e=[...entries,op('a','2026-11-25','reversal','-50',{original_kind:'growth'})];assert.equal(formatUnits(assetSeries([w('a','USDT','1400')],e,'USDT','2026-11-01','2026-11-26','growth').closing),'0');});
test('Отсутствующий актив не создаёт вымышленный график',()=>{const s=assetSeries(wallets,entries,'ETH','2026-11-01','2026-11-26');assert.equal(s.count,0);assert.equal(s.closing,'0');});
test('Ранний конец периода исключает поздние операции',()=>assert.equal(formatUnits(assetSeries(wallets,entries,'USDT','2026-11-01','2026-11-14').closing),'1050'));
console.log(JSON.stringify({passed}));
