interface AccessFile {version:number;iterations:number;salt:string;check:string}
let photoKey:CryptoKey|null=null;
const bytes=(base64:string)=>Uint8Array.from(atob(base64),char=>char.charCodeAt(0));

export async function unlock(code:string):Promise<boolean>{
  const embedded=document.querySelector<HTMLScriptElement>('#yorimichi-access');
  const access:AccessFile=embedded?.textContent?JSON.parse(embedded.textContent):await fetch(`${import.meta.env.BASE_URL}access.json`,{cache:'no-store'}).then(response=>{
    if(!response.ok)throw Error('Access code is not configured.');
    return response.json() as Promise<AccessFile>;
  });
  if(access.version!==1||access.iterations!==210000)throw Error('Unsupported access configuration.');
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(access.salt),iterations:access.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  try{
    const check=bytes(access.check);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:check.slice(0,12)},key,check.slice(12));
    if(new TextDecoder().decode(plain)!=='YORIMICHI ACCESS V1')return false;
  }catch{return false}
  photoKey=key;return true;
}

/** Where the album's photos and their index.json are: the deployed game reads the encrypted public/photos/, the dev server the plain local-photos/ (vite.config.mjs), which no build ever holds. */
export const photoBase=import.meta.env.DEV?'/local-photos/':`${import.meta.env.BASE_URL}photos/`;
export async function photoUrl(path:string):Promise<string>{
  if(import.meta.env.DEV)return photoBase+path;
  if(!photoKey)throw Error('The album is locked.');
  const response=await fetch(photoBase+path);
  if(!response.ok)throw Error('Photo unavailable.');
  const encrypted=new Uint8Array(await response.arrayBuffer());
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:encrypted.slice(0,12)},photoKey,encrypted.slice(12));
  return URL.createObjectURL(new Blob([plain],{type:'image/jpeg'}));
}
