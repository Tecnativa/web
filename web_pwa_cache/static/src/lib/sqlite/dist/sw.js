self.sqliteWorker=function(e){"use strict";const t=new WeakMap,n=(e,...n)=>{const{t:o,v:s}=((e,t)=>{const n=[e[0]],o=[];for(let s=0,c=0,l=0,{length:a}=t;c<a;c++)t[c]instanceof r?n[s]+=t[c].v+e[c+1]:(o[l++]=c,n[++s]=e[c+1]);return{t:n,v:o}})(e,n),c=t.get(e)||t.set(e,{}).get(e);return(c[o]||(c[o]=[o])).concat(s.map((e=>n[e])))};function r(e){this.v=e}const o=(e,t)=>(r,...o)=>new Promise(((c,a)=>{r.some(l)&&a(s(new Error("SQLITE_ERROR: SQL injection hazard")));const[i,...u]=n(r,...o);e[t](i.join("?"),u,((e,t)=>{e?a(e):c(t)}))})),s=e=>(e.code="SQLITE_ERROR",e),c=(e,...t)=>new r(function(e){for(var t=e[0],n=1,r=arguments.length;n<r;n++)t+=arguments[n]+e[n];return t}(e,...t)),l=e=>e.includes("?");function a(e){return{all:o(e,"all"),get:o(e,"get"),query:o(e,"run"),raw:c}}const{assign:i}=Object,u="function"==typeof importScripts,d=t=>new Promise(((n,r)=>{const o=()=>{const e=self.module.exports;delete self.exports,self.module=void 0,n(e)};if(self.exports={},self.module={exports:e},u)importScripts(t),o();else{const{head:e}=document;i(e.appendChild(document.createElement("script")),{onload(){e.removeChild(this),o()},onerror:r,src:t})}})),f="sqlite",p="buffer",m=(e,t=1)=>new Promise(((n,r)=>{i(indexedDB.open(e,t),{onupgradeneeded({target:{result:e,transaction:t}}){e.objectStoreNames.contains(f)||e.createObjectStore(f).createIndex(p,p,{unique:!0}),i(t,{oncomplete(){n(e)}})},onsuccess({target:{result:e}}){n(e)},onerror:r})}));function h({columns:e,values:t}){for(let{length:n}=t,r=0;r<n;r++){const n=t[r],o={};for(let{length:t}=e,r=0;r<t;r++)o[e[r]]=n[r];this.push(o)}}return(e={})=>new Promise(((t,n)=>{const r=e.dist||".";d(r+"/sql-wasm.js").then((({default:o})=>{Promise.all([m(e.name||"sqlite-worker"),o({locateFile:e=>r+"/"+e})]).then((([r,{Database:o}])=>{const s=e=>r.transaction([f],e).objectStore(f);i(s("readonly").get(p),{onsuccess(){let n=Promise.resolve();const{result:r}=this,c=new o(r||e.database||new Uint8Array(0));r||(n=n.then((()=>new Promise(((t,n)=>{const r=c.export();i(s("readwrite").put(r,p).transaction,{oncomplete(){t(),e.update&&e.update(r)},onabort:n,onerror:n})})))));const{all:l,get:u,query:d,raw:f}=a({all(e,t,n){try{const r=c.exec(e,t),o=[];r.forEach(h,o),n(null,o)}catch(e){n(e)}},get(e,t,n){try{const r=c.exec(e+" LIMIT 1",t),o=[];r.forEach(h,o),n(null,o.shift()||null)}catch(e){n(e)}},run(e,t,n){try{n(null,c.run(e,t))}catch(e){n(e)}}});t({all:l,get:u,raw:f,query(e){return d.apply(this,arguments)}})},onerror:n})}),n)}))}))}({});