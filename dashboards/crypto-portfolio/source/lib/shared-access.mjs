import {fail} from './model.mjs';
const first=async(db,q,...v)=>db.prepare(q).bind(...v).first();
export async function tokenHash(token){const bytes=new TextEncoder().encode(token),hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==64||b.length!==64)return false;let different=0;for(let i=0;i<64;i++)different|=a.charCodeAt(i)^b.charCodeAt(i);return different===0;}
export async function sharedContext(db,env,token){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token||''))fail('Нужна действующая секретная ссылка.',401);
 const hash=await tokenHash(token),admin=equal(hash,env.ACCESS_ADMIN_HASH),viewer=equal(hash,env.ACCESS_VIEWER_HASH);
 if(!admin&&!viewer)fail('Ссылка недействительна или заменена.',401);
 if(!env.ACCESS_EXPIRES_AT||!Number.isFinite(Date.parse(env.ACCESS_EXPIRES_AT))||Date.parse(env.ACCESS_EXPIRES_AT)<=Date.now())fail('Срок действия ссылки истёк.',401);
 const owner=await first(db,'SELECT * FROM owners WHERE id=1');if(!owner||owner.share_enabled===0)fail('Доступ по ссылкам отключён владельцем.',403);
 const profile=env.ACCESS_PROFILE_ID?await first(db,'SELECT id FROM profiles WHERE id=?',env.ACCESS_PROFILE_ID):await first(db,'SELECT id FROM profiles WHERE viewer_email=? ORDER BY created_at LIMIT 1',owner.email.toLowerCase());
 if(!profile)fail('Портфель для общего доступа не настроен.',403);
 return {role:admin?'admin':'viewer',scopeProfileId:profile.id,capability:true,owner:null,user:{userId:'link-'+hash.slice(0,12),email:admin?'Ссылка администратора':'Ссылка пользователя'}};
}
export async function checkSharedWrite(db,ctx,b){
 if(ctx.role!=='admin')fail('Эта ссылка разрешает только просмотр.',403);
 if(!['transaction','operation','import','reverse','wallet','price','setup_wallets'].includes(b.action))fail('Это действие доступно только владельцу через вход.',403);
 if(b.profileId!==ctx.scopeProfileId)fail('Нет доступа к этому портфелю.',403);
 if(['wallet','setup_wallets','import'].includes(b.action))return;
 if(b.action==='reverse'){const e=await first(db,'SELECT profile_id FROM entries WHERE id=?',b.entryId);if(!e||e.profile_id!==ctx.scopeProfileId)fail('Нет доступа к этой операции.',403);return;}
 for(const id of [b.walletId,...(b.targetWalletId?[b.targetWalletId]:[])]){const w=await first(db,'SELECT profile_id FROM wallets WHERE id=?',id);if(!w||w.profile_id!==ctx.scopeProfileId)fail('Нет доступа к этому кошельку.',403);}
}
