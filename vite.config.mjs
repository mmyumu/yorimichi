import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { defineConfig } from 'vite';

// The plain photos of local-photos/ (scripts/import-photos.mjs), served by the dev server only: outside public/, no build copies them, so only the encrypted public/photos/ is ever deployed.
const root=resolve('local-photos');
const localPhotos={name:'local-photos',apply:'serve',configureServer(server){
  server.middlewares.use('/local-photos',async(request,response,next)=>{
    const file=resolve(root,'.'+decodeURIComponent((request.url??'/').split('?')[0]));
    if(relative(root,file).startsWith('..'))return next();
    try{const data=await readFile(file);response.setHeader('Content-Type',file.endsWith('.json')?'application/json':'image/jpeg');response.setHeader('Cache-Control','no-store');response.end(data)}
    catch{response.statusCode=404;response.end()}
  });
}};
export default defineConfig({plugins:[localPhotos]});
