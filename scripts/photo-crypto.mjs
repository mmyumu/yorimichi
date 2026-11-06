import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';

export const iterations=210000;
export const decode=base64=>Buffer.from(base64,'base64');
export const encode=bytes=>bytes.toString('base64');
export const keyFor=(code,salt)=>pbkdf2Sync(code,salt,iterations,32,'sha256');
export function encrypt(bytes,key){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
  return Buffer.concat([iv,cipher.update(bytes),cipher.final(),cipher.getAuthTag()]);
}
