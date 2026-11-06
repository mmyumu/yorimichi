// YORIMICHI_CODE='your private code' node scripts/set-access-code.mjs
// Or run with --generate to create and print a random code once.
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { encode, encrypt, keyFor, iterations } from './photo-crypto.mjs';

const generated=process.argv.includes('--generate');
const code=generated?`PAGE-17-${randomBytes(10).toString('hex').toUpperCase()}`:process.env.YORIMICHI_CODE;
if(!code||code.length<12)throw Error('Set YORIMICHI_CODE to at least 12 characters, or use --generate.');
const salt=randomBytes(16),check=encrypt(Buffer.from('YORIMICHI ACCESS V1'),keyFor(code,salt));
mkdirSync('public',{recursive:true});
writeFileSync('public/access.json',JSON.stringify({version:1,iterations,salt:encode(salt),check:encode(check)}));
console.log('Access verifier written to public/access.json. Reimport photos with this code after changing it.');
if(generated)console.log(`Your code: ${code}`);
