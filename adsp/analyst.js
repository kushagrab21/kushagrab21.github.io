// ADSP's analyst: the articulated craft of Followthrough, with a data-specific body and tools.
// This is an illustration of the local calculation, not a running model or recorded AI trace.
import * as THREE from './vendor/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
const mix = (a,b,t) => a+(b-a)*t;
const smooth = x => { x=Math.max(0,Math.min(1,x));return x*x*(3-2*x); };
const mat = (color,extra={}) => new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.12,...extra});
const box = (w,h,d,r,m) => new THREE.Mesh(new RoundedBoxGeometry(w,h,d,4,r),m);

export function createAnalyst(host) {
  let renderer;
  try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'}); } catch {return null;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);host.classList.add('has-analyst');
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(25,1,.1,30);camera.position.set(0,2.05,5.2);camera.lookAt(0,1.02,0);
  scene.add(new THREE.HemisphereLight(0xffeac4,0x392719,2.4));
  const key=new THREE.DirectionalLight(0xffdc92,4);key.position.set(-3,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0x98d8ee,2);rim.position.set(4,3,-2);scene.add(rim);
  const body=mat(0xf0dcb5), bronze=mat(0x936b3d,{metalness:.5}), dark=mat(0x382c24), paper=mat(0xfff0d0), blue=mat(0x81cce8,{emissive:0x28596b,emissiveIntensity:.5});
  const lamp=mat(0xffce65,{emissive:0xffb53d,emissiveIntensity:1.4});
  const rig=new THREE.Group();scene.add(rig);
  const add=(geo,m,x,y,z,parent=rig)=>{const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  // Brass swivel base, rounded calculating body and a small spool of data on either side.
  add(new THREE.CylinderGeometry(.58,.68,.11,48),dark,0,.06,0);
  add(new THREE.TorusGeometry(.59,.028,10,48),bronze,0,.13,0).rotation.x=Math.PI/2;
  add(new THREE.CylinderGeometry(.15,.2,.34,24),bronze,0,.31,0);
  const torso=box(.93,.74,.57,.17,body);torso.position.set(0,.85,0);rig.add(torso);
  const chest=box(.65,.37,.045,.06,dark);chest.position.set(0,.9,.29);rig.add(chest);
  const bars=[.11,.22,.16,.28,.2].map((h,i)=>add(new THREE.BoxGeometry(.065,h,.018),blue,-.23+i*.115,.8+h/2,.323));
  add(new THREE.CylinderGeometry(.09,.11,.12,20),bronze,0,1.29,0);
  const head=new THREE.Group();head.position.set(0,1.58,0);rig.add(head);
  const shell=box(.79,.49,.54,.2,body);head.add(shell);
  const visor=box(.64,.235,.055,.09,dark);visor.position.set(0,0,.265);head.add(visor);
  const eyes=[-.15,.15].map(x=>{const eye=box(.08,.07,.035,.027,lamp);eye.position.set(x,0,.302);head.add(eye);return eye;});
  // An offset brass lens makes this a data reader, rather than a second copy of the editor.
  const lens=add(new THREE.TorusGeometry(.115,.018,12,40),bronze,-.15,0,.334,head);
  add(new THREE.CylinderGeometry(.015,.015,.19,10),bronze,.27,.33,-.03,head);
  add(new THREE.SphereGeometry(.045,16,12),lamp,.27,.44,-.03,head);
  const arms=[-1,1].map(side=>{
    const pivot=new THREE.Group();pivot.position.set(side*.53,1.1,0);rig.add(pivot);
    add(new THREE.SphereGeometry(.1,20,14),bronze,0,0,0,pivot);
    add(new THREE.CapsuleGeometry(.068,.22,6,14),body,0,-.16,0,pivot);
    const elbow=new THREE.Group();elbow.position.y=-.32;pivot.add(elbow);
    add(new THREE.SphereGeometry(.076,16,12),bronze,0,0,0,elbow);
    add(new THREE.CapsuleGeometry(.061,.2,6,12),body,0,-.14,0,elbow);
    add(new THREE.SphereGeometry(.083,16,12),body,0,-.3,0,elbow);
    return {pivot,elbow};
  });
  const tray=box(1.04,.07,.4,.03,bronze);tray.position.set(0,.58,.34);rig.add(tray);
  const documentGroup=new THREE.Group();rig.add(documentGroup);
  const sheet=box(.43,.52,.024,.035,paper);documentGroup.add(sheet);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=320;
  const ctx=labelCanvas.getContext('2d');const texture=new THREE.CanvasTexture(labelCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  const label=add(new THREE.PlaneGeometry(.4,.49),new THREE.MeshBasicMaterial({map:texture}),0,0,.017,documentGroup);
  let labelKey='';
  function paintLabel(state){
    const key=[state.step,state.count,state.sum,state.mean].join(':');if(key===labelKey)return;labelKey=key;
    ctx.fillStyle='#fff0d0';ctx.fillRect(0,0,256,320);ctx.textAlign='center';ctx.fillStyle='#543c25';
    ctx.font='24px sans-serif';ctx.fillText(state.step===0?'STUDENTS':state.step===1?'SCORE TOTAL':'AVERAGE',128,49);
    ctx.font='bold 59px sans-serif';ctx.fillText(state.step===0?String(state.count):state.step===1?String(state.sum):state.mean===null?'—':state.mean.toFixed(1),128,124);
    if(state.step===0){for(let i=0;i<5;i++){ctx.fillStyle=i<3?'#70aecb':'#d3c4a6';ctx.fillRect(33,160+i*24,190,12);}}
    else if(state.step===1){ctx.font='32px sans-serif';ctx.fillText('÷ '+state.count,128,190);ctx.fillRect(35,216,186,2);ctx.fillText(state.mean===null?'—':state.mean.toFixed(1),128,269);}
    else{ctx.font='22px sans-serif';ctx.fillText('out of 100',128,169);for(let i=0;i<5;i++){ctx.fillStyle='#70aecb';ctx.fillRect(32+i*40,276-i*17,24,15+i*17);}}
    texture.needsUpdate=true;
  }
  // Round, fading pool and a contact shadow; neither introduces a second rectangular stage.
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const gc=glowCanvas.getContext('2d');
  const grad=gc.createRadialGradient(64,64,8,64,64,64);grad.addColorStop(0,'rgba(255,193,86,.35)');grad.addColorStop(1,'rgba(255,193,86,0)');gc.fillStyle=grad;gc.fillRect(0,0,128,128);
  const glowTexture=new THREE.CanvasTexture(glowCanvas);
  const pool=add(new THREE.PlaneGeometry(3.5,2.4),new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,depthWrite:false}),0,-.01,0,scene);pool.rotation.x=-Math.PI/2;
  // Tiny row slips move along curved paths into the hand, and an answer slip moves out.
  const packets=Array.from({length:7},()=>{const p=box(.12,.085,.018,.01,blue);scene.add(p);return p;});
  let lastFrame=performance.now(),poseDirection=-1,poseCount=0;
  let userYaw=0,userPitch=0,lastState={step:0,phase:.4,count:40,sum:1531,mean:38.275,time:0};
  function frame(state=lastState){
    lastState=state;paintLabel(state);
    const f=state.phase,targetDirection=state.step===0?-1:state.step===2?1:0;
    const now=performance.now(),blend=state.moving?1-Math.exp(-Math.min(.1,(now-lastFrame)/1000)*3):1;lastFrame=now;
    poseDirection=mix(poseDirection,targetDirection,blend);poseCount=mix(poseCount,state.step===1?1:0,blend);
    const direction=poseDirection;
    const reach=Math.sin(Math.PI*smooth(f));
    rig.rotation.y=userYaw+direction*.12;rig.rotation.x=userPitch;
    head.rotation.y=direction*.38;head.rotation.x=mix(.04,.17,poseCount);
    // A readable receiving, counting or offering pose, with a continuous gentle gesture.
    arms[0].pivot.rotation.set(-.7-(Math.max(0,-direction)*.5*reach+poseCount*.3),0,-.24-(Math.max(0,-direction)*.42*reach));
    arms[1].pivot.rotation.set(-.65-(Math.max(0,direction)*.65*reach+poseCount*.3),0,.24+(Math.max(0,direction)*.48*reach));
    arms.forEach(a=>a.elbow.rotation.x=-.48);
    documentGroup.position.set(direction*(.42+.14*reach),.74+.08*reach,.55);
    documentGroup.rotation.set(-.18, direction*-.3, direction*-.1);
    eyes.forEach(e=>e.scale.y=.94+.06*Math.cos(state.time*1.1));
    bars.forEach((b,i)=>b.scale.y=state.step===1?.65+.35*Math.sin(f*Math.PI*2-i*.8):1);
    packets.forEach((p,i)=>{
      p.visible=state.moving&&state.step!==1;
      const t=(f*3+i/7)%1; // ~2.7 s per crossing (was ~5 s): the user asked for pacier dots
      const x=state.step===0?mix(-1.85,-.65,t):mix(.65,1.85,t);
      p.position.set(x,.81+Math.sin(t*Math.PI)*.21,.16);p.rotation.set(0,.3,Math.sin(t*Math.PI)*.2);
      p.scale.setScalar(.7+Math.sin(t*Math.PI)*.3);
    });
    renderer.render(scene,camera);
  }
  function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();frame();}
  const ro=new ResizeObserver(resize);ro.observe(host);
  let drag=null;
  host.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,yaw:userYaw,pitch:userPitch};host.setPointerCapture(e.pointerId);host.classList.add('turning');});
  host.addEventListener('pointermove',e=>{if(!drag)return;userYaw=Math.max(-.75,Math.min(.75,drag.yaw+(e.clientX-drag.x)*.008));userPitch=Math.max(-.18,Math.min(.18,drag.pitch+(e.clientY-drag.y)*.005));frame();});
  function release(){drag=null;host.classList.remove('turning');}
  host.addEventListener('pointerup',release);host.addEventListener('pointercancel',release);host.addEventListener('lostpointercapture',release);
  host.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();userYaw=Math.max(-.75,Math.min(.75,userYaw+(e.key==='ArrowLeft'?-.15:.15)));frame();});
  resize();
  return {frame,reset(){userYaw=0;userPitch=0;frame();},dispose(){ro.disconnect();renderer.dispose();}};
}
