import Phaser from 'phaser';

/** The scene's colour grade, a post pipeline on the main camera: bright, clean colours in place of the art's khaki cast.
 * Muted greens and olives turn a fresh grass green, beiges and creams lose their yellow, olive greys cool to blue-grey;
 * vivid colours (line colours, signs, shop fronts) are left as drawn. The art keeps its own colours; only what is shown changes. */
const shader=`
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;
vec3 hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));
  float d=q.x-min(q.w,q.y),e=1.e-10;return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x);}
vec3 rgb(vec3 c){vec3 p=abs(fract(c.xxx+vec3(1.,2./3.,1./3.))*6.-3.);return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y);}
void main(){
  vec4 c=texture2D(uMainSampler,outTexCoord);vec3 h=hsv(c.rgb);float deg=h.x*360.,muted=1.-smoothstep(.45,.75,h.y),grey=1.-smoothstep(.1,.22,h.y);
  float green=smoothstep(48.,70.,deg)*(1.-smoothstep(150.,175.,deg))*muted*(1.-grey);
  float beige=smoothstep(12.,28.,deg)*(1.-smoothstep(58.,72.,deg))*(1.-smoothstep(.2,.42,h.y));
  float olive=smoothstep(50.,70.,deg)*(1.-smoothstep(170.,190.,deg))*grey;
  // Greens: towards 105°, twice as saturated, a little lighter.
  deg=mix(deg,105.+(deg-105.)*.45,green);h.y=mix(h.y,min(1.,h.y*1.65+.04),green);h.z=mix(h.z,min(1.,h.z*1.06+.03),green);
  // Beiges: half the yellow, a touch lighter.
  deg=mix(deg,mix(deg,32.,.4),beige);h.y=mix(h.y,h.y*.45,beige);h.z=mix(h.z,min(1.,h.z+.03),beige);
  // Olive greys: cool blue-grey.
  deg=mix(deg,212.,olive);h.y=mix(h.y,max(h.y,.08),olive);
  // Everything else muted gets a little more colour.
  h.y=mix(h.y,min(1.,h.y*1.15),muted*(1.-green)*(1.-beige)*(1.-olive));
  gl_FragColor=vec4(rgb(vec3(fract(deg/360.),h.y,h.z)),c.a);
}`;
export class Vivid extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline{constructor(game:Phaser.Game){super({game,name:'Vivid',fragShader:shader})}}
/** Grades the scene's camera (WebGL only: the canvas renderer shows the art as drawn). */
export function vivid(scene:Phaser.Scene){
  const renderer=scene.renderer;if(!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer))return;
  if(!renderer.pipelines.postPipelineClasses.has('Vivid'))renderer.pipelines.addPostPipeline('Vivid',Vivid);scene.cameras.main.setPostPipeline('Vivid');
}
