!function(){"use strict";const{assign:e}=Object,t="function"==typeof importScripts;t||(document.currentScript&&document.currentScript.src||new URL("tmp.js",document.baseURI).href).replace(/\/[^/]*$/,"");const s=s=>new Promise(((o,r)=>{const n=()=>{const e=self.module.exports;delete self.exports,self.module=void 0,o(e)};if(self.exports={},self.module={exports:exports},t)importScripts(s),n();else{const{head:t}=document;e(t.appendChild(document.createElement("script")),{onload(){t.removeChild(this),n()},onerror:r,src:s})}}));let o=null;addEventListener("message",(({data:{id:e,action:t,options:r}})=>{if("init"===t)o||(o=s(r.library).then((({init:e})=>e(r)))),o.then((()=>postMessage({id:e,result:"OK"})),(({message:t})=>postMessage({id:e,error:t})));else{const{template:s,values:n}=r;o.then((o=>{o[t].apply(null,[s].concat(n)).then((t=>{postMessage({id:e,result:t})}),(({message:t})=>{postMessage({id:e,error:t})}))}))}}))}();