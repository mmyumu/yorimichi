// Copies the selection into public/photos/<sight>/ for the album: at most 1600 px, without their metadata (GPS included), with public/photos/index.json listing them.
// public/photos/ stays out of the repository: the photos are personal and the repository is public.
// node scripts/import-photos.mjs <selection folder>. A folder not listed here is reported and left out.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const pages={'01 Tokyo - Asakusa':'asakusa','02 Tokyo - Shibuya et Harajuku':'shibuya-crossing','03 Tokyo - Meiji-jingu':'meiji','04 Kyoto - Kinkaku-ji':'kinkaku','05 Kyoto - Kenkun-jinja':'kenkun','06 Kyoto - Daitoku-ji':'daitoku','07 Kyoto - Jardin de bonsais':'daitoku',
  '08 Kyoto - Kamo et Yasaka':'yasaka','09 Kyoto - Higashiyama et Chion-in':'higashiyama','10 Kyoto - Heian-jingu':'heian','11 Kyoto - Ginkaku-ji':'ginkaku','12 Kyoto - Sanctuaire aux lanternes':'lanterns','13 Kyoto - Ville':'kyoto-tower','14 Rakusai - Bambouseraie':'rakusai',
  '15 Osaka - Dotonbori':'dotonbori','15 Osaka - Shinsekai':'shinsekai','16 Lac Biwa':'biwako','16 Otsu':'otsu-shore','17 Nikko - Temples et sanctuaires':'toshogu','18 Nikko - Jardin':'toshogu','19 Nikko - Kanmangafuchi':'kanmangafuchi','20 Nikko - Pont Shinkyo':'shinkyo','21 Nikko - Nature':'kanmangafuchi',
  '22 Kamakura':'kamakura-trail','23 Tokyo - Odaiba':'odaiba','23 Tokyo - Ginza':'ginza','24 Souvenirs':'road'};
// The photos of a folder that belong on another page of the same place: Heian-jingu's memories are the precincts, the garden and the street with the great torii.
const moved={'img20261011133555.jpg':'biwako-horai','img20261011133602.jpg':'biwako-horai','img20261011134044.jpg':'biwako-horai','img20261011131045.jpg':'biwako-bridge','img20261011131619.jpg':'biwako-bridge','img20261011134130.jpg':'biwako-horai','img20261007153615.jpg':'heian-road','img20261007171419.jpg':'heian-road','img20261007163717.jpg':'heian-garden','img20261007163814.jpg':'heian-garden','img20261007164011.jpg':'heian-garden'};
const from=process.argv[2],to='public/photos';if(!from)throw Error('Usage: node scripts/import-photos.mjs <selection folder>');
rmSync(to,{recursive:true,force:true});const index={};
for(const folder of readdirSync(from).sort()){
  const page=pages[folder];if(!page){console.warn(`Left out: ${folder}`);continue}
  for(const name of readdirSync(join(from,folder)).filter(name=>/\.jpe?g$/i.test(name)).sort()){
    const file=name.toLowerCase(),here=moved[file]??page;mkdirSync(join(to,here),{recursive:true});
    execFileSync('ffmpeg',['-v','error','-y','-i',join(from,folder,name),'-vf','scale=1600:1600:force_original_aspect_ratio=decrease','-map_metadata','-1','-q:v','4',join(to,here,file)]);
    (index[here]??=[]).push(file);
  }
}
writeFileSync(join(to,'index.json'),JSON.stringify(index));
console.log(`${Object.values(index).flat().length} photos on ${Object.keys(index).length} pages`);
