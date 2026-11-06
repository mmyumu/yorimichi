// Resizes and strips metadata from the photos into local-photos/, plain, which only the dev server reads (vite.config.mjs), and, with YORIMICHI_CODE set, encrypts them into public/photos/, what is published.
// Both stay out of the repository: the photos are personal and the repository is public.
// [YORIMICHI_CODE='the code'] node scripts/import-photos.mjs <selection folder>. A folder not listed here is reported and left out.
import { execFileSync } from 'node:child_process';
import { createDecipheriv, randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decode, encrypt, keyFor } from './photo-crypto.mjs';
const pages={'01 Tokyo - Asakusa':'asakusa','02 Tokyo - Shibuya et Harajuku':'shibuya-crossing','03 Tokyo - Meiji-jingu':'meiji','04 Kyoto - Kinkaku-ji':'kinkaku','05 Kyoto - Kenkun-jinja':'kenkun','06 Kyoto - Daitoku-ji':'daitoku','07 Kyoto - Jardin de bonsais':'daitoku',
  '08 Kyoto - Kamo et Yasaka':'yasaka','09 Kyoto - Higashiyama et Chion-in':'higashiyama','10 Kyoto - Heian-jingu':'heian','11 Kyoto - Ginkaku-ji':'ginkaku','12 Kyoto - Sanctuaire aux lanternes':'lanterns','13 Kyoto - Ville':'kyoto-tower','14 Rakusai - Bambouseraie':'rakusai',
  '15 Osaka - Dotonbori':'dotonbori','15 Osaka - Shinsekai':'shinsekai','16 Lac Biwa':'biwako','16 Otsu':'otsu-shore','17 Nikko - Temples et sanctuaires':'toshogu','18 Nikko - Jardin':'toshogu','19 Nikko - Kanmangafuchi':'kanmangafuchi','20 Nikko - Pont Shinkyo':'shinkyo','21 Nikko - Nature':'kanmangafuchi',
  '22 Kamakura':'kamakura-trail','23 Tokyo - Odaiba':'odaiba','23 Tokyo - Ginza':'ginza','24 Souvenirs':'road'};
// The photos of a folder that belong on another page of the same place: Heian-jingu's memories are the precincts, the garden and the street with the great torii.
const moved={'img20261011133555.jpg':'biwako-horai','img20261011133602.jpg':'biwako-horai','img20261011134044.jpg':'biwako-horai','img20261011131045.jpg':'biwako-bridge','img20261011131619.jpg':'biwako-bridge','img20261011134130.jpg':'biwako-horai','img20261007153615.jpg':'heian-road','img20261007171419.jpg':'heian-road','img20261007163717.jpg':'heian-garden','img20261007163814.jpg':'heian-garden','img20261007164011.jpg':'heian-garden'};
const from=process.argv[2],to='public/photos',plainTo='local-photos';if(!from)throw Error('Usage: [YORIMICHI_CODE=…] node scripts/import-photos.mjs <selection folder>');
// Without the code, only the plain copy for the dev server is made; the published photos stay as they were.
const code=process.env.YORIMICHI_CODE;let key=null;
if(code){
  const access=JSON.parse(readFileSync('public/access.json','utf8'));
  if(access.version!==1)throw Error('Unsupported access configuration.');
  key=keyFor(code,decode(access.salt));const check=decode(access.check);
  try{const decipher=createDecipheriv('aes-256-gcm',key,check.subarray(0,12));decipher.setAuthTag(check.subarray(-16));
    if(Buffer.concat([decipher.update(check.subarray(12,-16)),decipher.final()]).toString()!=='YORIMICHI ACCESS V1')throw Error();
  }catch{throw Error('Wrong access code. Photos were not changed.');}
}else console.warn('No YORIMICHI_CODE: plain photos for the dev server only, public/photos/ left as it was.');
const temp=mkdtempSync(join(tmpdir(),'yorimichi-photos-')),staging='public/photos.tmp',plainStaging='local-photos.tmp';
for(const dir of [staging,plainStaging]){rmSync(dir,{recursive:true,force:true});mkdirSync(dir,{recursive:true})}const index={},plainIndex={};
try{
for(const folder of readdirSync(from).sort()){
  const page=pages[folder];if(!page){console.warn(`Left out: ${folder}`);continue}
  for(const name of readdirSync(join(from,folder)).filter(name=>/\.jpe?g$/i.test(name)).sort()){
    const file=name.toLowerCase(),here=moved[file]??page,out=join(temp,'photo.jpg'),id=randomBytes(12).toString('hex');
    execFileSync('ffmpeg',['-v','error','-y','-i',join(from,folder,name),'-vf','scale=1600:1600:force_original_aspect_ratio=decrease','-map_metadata','-1','-q:v','4',out]);
    mkdirSync(join(plainStaging,here),{recursive:true});writeFileSync(join(plainStaging,here,id+'.jpg'),readFileSync(out));(plainIndex[here]??=[]).push(id+'.jpg');
    if(key){mkdirSync(join(staging,here),{recursive:true});writeFileSync(join(staging,here,id+'.bin'),encrypt(readFileSync(out),key));(index[here]??=[]).push(id+'.bin')}
  }
}
writeFileSync(join(plainStaging,'index.json'),JSON.stringify(plainIndex));rmSync(plainTo,{recursive:true,force:true});renameSync(plainStaging,plainTo);
if(key){writeFileSync(join(staging,'index.json'),JSON.stringify(index));rmSync(to,{recursive:true,force:true});renameSync(staging,to)}
console.log(`${Object.values(plainIndex).flat().length} photos on ${Object.keys(plainIndex).length} pages: ${plainTo}/ (plain, dev server)${key?` and ${to}/ (encrypted, published)`:''}`);
}finally{for(const dir of [temp,staging,plainStaging])rmSync(dir,{recursive:true,force:true})}
