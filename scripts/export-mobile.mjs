import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve('dist');
let html=await readFile(resolve(root,'index.html'),'utf8');
const script=html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
const css=html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
if(!script||!css)throw Error('Production assets missing; run npm run build first.');
const js=await readFile(resolve(root,script[1].replace(/^\//,'')),'utf8');
let style=await readFile(resolve(root,css[1].replace(/^\//,'')),'utf8');
for(const match of style.matchAll(/url\((['"]?)(\/assets\/[^'"\)]+\.woff2)\1\)/g)){
  const font=await readFile(resolve(root,match[2].slice(1)));
  style=style.replace(match[0],`url(data:font/woff2;base64,${font.toString('base64')})`);
}
html=html.replace(script[0],()=>'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>');
html=html.replace(css[0],()=>'<style>'+style+'</style>');
const target=resolve(process.argv[2]??'dist/yorimichi-mobile.html');
await writeFile(target,html);console.log('Version autonome : '+target);
