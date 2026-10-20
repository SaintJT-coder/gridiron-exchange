const VERSION='2026-10-20-pwa-1';
export function setupPwa(){
 const banner=document.createElement('div');banner.id='app-update-banner';banner.setAttribute('role','status');banner.innerHTML='<span>Update available 🚀</span><button type="button">Refresh</button>';document.body.appendChild(banner);
 banner.querySelector('button').addEventListener('click',()=>location.reload());
 async function check(){if(document.hidden)return;try{const response=await fetch(import.meta.env.BASE_URL+'index.html?version_check='+Date.now(),{cache:'no-store'});if(!response.ok)return;const html=await response.text();const match=html.match(/<meta name="app-release" content="([^"]+)"/);if(match&&match[1]!==VERSION)banner.style.display='flex';}catch{}}
 setInterval(check,120000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});window.addEventListener('focus',check);
 if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js').catch(()=>{}));
}
