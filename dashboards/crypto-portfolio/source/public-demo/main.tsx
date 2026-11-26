import React from 'react';
import {createRoot} from 'react-dom/client';
import Portfolio from '../app/portfolio';
import '../app/globals.css';
const key=new URLSearchParams(location.hash.slice(1)).get('access');
const api='https://crypto-portfolio-ks.agile-mochi-0052.chatgpt.site/api/shared-portfolio';
const sharedRequest:typeof fetch=async(input,options={})=>{
 const raw=String(input),params=raw.includes('?')?raw.slice(raw.indexOf('?')):'',headers=new Headers(options.headers);headers.set('X-Portfolio-Key',key||'');
 return fetch(api+params,{...options,headers,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
};
createRoot(document.getElementById('root')!).render(key?<Portfolio request={sharedRequest}/>:<main className="link-landing"><div className="brand-mark">П</div><div className="eyebrow">ПОРТФЕЛЬ · ЗАКРЫТЫЙ ДОСТУП</div><h1>Откройте свою секретную ссылку</h1><p>Для входа нужна полная ссылка администратора или пользователя, выданная владельцем. Здесь нет списка портфелей и общедоступных балансов.</p><a className="button primary" href="https://crypto-portfolio-ks.agile-mochi-0052.chatgpt.site/">Вход владельца через ChatGPT</a></main>);
