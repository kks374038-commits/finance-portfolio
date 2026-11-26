import {clean,validDate,fail} from './model.mjs';
import {planTransaction,requestSignature} from './transactions.mjs';
const query=(db,q,...v)=>db.prepare(q).bind(...v),all=async(db,q,...v)=>(await query(db,q,...v).all()).results;
async function commit(db,ctx,plan){
 const guard=crypto.randomUUID(),timestamp=new Date().toISOString(),statements=[],conditions=plan.touched.map(()=>'(SELECT version FROM wallets WHERE id=?)=?').join(' AND ');
 statements.push(query(db,`INSERT INTO guards(id,ok) VALUES(?,CASE WHEN ${conditions} THEN 1 ELSE 0 END)`,guard,...plan.touched.flatMap(w=>[w.id,w.initialVersion])));
 for(const w of plan.touched)statements.push(query(db,'UPDATE wallets SET balance=?,last_date=?,version=version+1 WHERE id=?',w.balance,plan.date,w.id));
 for(const e of plan.steps)statements.push(query(db,'INSERT INTO entries(id,profile_id,wallet_id,kind,units,date,note,actor,created_at,reversal_of,original_kind,percent,base_units,group_id,meta) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',e.id,plan.profileId,e.wallet_id,e.kind,e.units,e.date,e.note,ctx.user.email,timestamp,e.reversal_of||null,e.original_kind||null,e.percent||null,e.base_units||null,e.group_id,e.meta||null));
 statements.push(query(db,'INSERT INTO audit(id,actor,action,detail,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),ctx.user.email,'Операция с комиссией / обмен',JSON.stringify({group:plan.id,profileId:plan.profileId,...plan.details}),timestamp),query(db,'DELETE FROM guards WHERE id=?',guard));
 try{await db.batch(statements);}catch(e){if(/constraint|UNIQUE/i.test(String(e)))fail('Данные изменились или запрос уже записан. Обновите страницу.',409);throw e;}
 return {ok:true,imported:plan.steps.length};
}
export async function recordTransaction(db,ctx,b){
 const id=clean(b.requestId,100),prior=await query(db,'SELECT * FROM entries WHERE id=?',id).first();
 if(prior){if(prior.profile_id!==b.profileId||!prior.meta||JSON.parse(prior.meta).signature!==requestSignature(b))fail('ID запроса уже используется другой операцией.',409);return {ok:true,alreadyRecorded:true};}
 const wallets=await all(db,'SELECT * FROM wallets WHERE profile_id=?',clean(b.profileId,100));
 return commit(db,ctx,planTransaction(wallets,b));
}
export async function reverseTransaction(db,ctx,b,entry){
 const rootId=entry.group_id,prior=await query(db,'SELECT * FROM entries WHERE id=?',clean(b.requestId,100)).first();
 if(prior){if(prior.profile_id!==b.profileId||!prior.meta||JSON.parse(prior.meta).signature!==requestSignature(b))fail('ID запроса занят другой операцией.',409);return {ok:true,alreadyRecorded:true};}
 const originals=await all(db,'SELECT * FROM entries WHERE group_id=? AND profile_id=?',rootId,b.profileId);
 if(!originals.length||originals.some(e=>e.kind==='reversal'))fail('Эту группу нельзя сторнировать.');
 const undone=await query(db,'SELECT id FROM entries WHERE reversal_of IN ('+originals.map(()=>'?').join(',')+')',...originals.map(e=>e.id)).first();if(undone)fail('Операция уже сторнирована.',409);
 const date=validDate(b.date),note=clean(b.note,500),wallets=await all(db,'SELECT * FROM wallets WHERE profile_id=?',b.profileId),steps=originals.map((e,i)=>({id:b.requestId+(i?':'+i:''),wallet_id:e.wallet_id,kind:'reversal',units:(-BigInt(e.units)).toString(),date,note,group_id:b.requestId,reversal_of:e.id,original_kind:e.kind}));
 const touched=[...new Set(steps.map(e=>e.wallet_id))].map(id=>{const w=wallets.find(w=>w.id===id);if(!w||date<w.last_date)fail('Проверьте дату и доступность счетов.');const balance=BigInt(w.balance)+steps.filter(e=>e.wallet_id===id).reduce((s,e)=>s+BigInt(e.units),0n);if(balance<0n)fail('Для полного сторно недостаточно остатка на одном из счетов.');return {...w,balance:balance.toString(),initialVersion:w.version};});
 steps[0].meta=JSON.stringify({signature:requestSignature(b),type:'reversal',originalGroup:rootId});return commit(db,ctx,{id:b.requestId,profileId:b.profileId,date,steps,touched,details:{type:'reversal',originalGroup:rootId}});
}
