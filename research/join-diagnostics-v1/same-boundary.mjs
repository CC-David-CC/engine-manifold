// Diagnostic counterexamples from boxes and ordinary native subtraction only.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
const glue=process.env.CODI_MANIFOLD_GLUE, wasmPath=process.env.CODI_MANIFOLD_WASM, out=process.env.CODI_OBSERVATION;
assert(glue&&wasmPath&&out&&!fs.existsSync(out));
const pins=JSON.parse(fs.readFileSync(process.env.CODI_NATIVE_PINS));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
assert.equal(sha(fs.readFileSync(glue)),pins.jsSha256);assert.equal(sha(fs.readFileSync(wasmPath)),pins.wasmSha256);
const M=await(await import(pathToFileURL(glue))).default({wasmBinary:fs.readFileSync(wasmPath)});M.setup();
const objects=new Set(),own=x=>{objects.add(x);return x},free=x=>{x.delete();objects.delete(x)};
const box=(o,d)=>{const initial=own(M.Manifold.cube(d,false));try{return own(initial.translate(o));}finally{free(initial);}};
const r={status:'RUNNING',scope:'Native boxed-CSG observation; no Join certificate or mesh classifier',pins,producerSha256:sha(fs.readFileSync(new URL(import.meta.url))),rows:[]};
try{
 const outer=box([0,0,0],[30,30,30]);
 const first=box([-1,-1,-1],[16,16,16]),cut=own(outer.subtract(first));
 for(const[id,o,d,volume]of[
  ['exterior-notches-separated',[16,16,16],[15,15,15],20881],
  ['exterior-notches-point-touch',[15,15,15],[16,16,16],20250],
  ['exterior-notches-edge-touch',[15,15,-1],[16,16,32],16875]]){
   const tool=box(o,d),s=own(cut.subtract(tool)),parts=s.decompose();
   try{const row={id,source:{outer:{origin:[0,0,0],dimensions:[30,30,30]},first:{origin:[-1,-1,-1],dimensions:[16,16,16]},second:{origin:o,dimensions:d}},status:s.status(),volume:s.volume(),components:parts.map(p=>({volume:p.volume(),status:p.status(),twoManifold:p.nativeIs2ManifoldDiagnostic(),selfIntersecting:p.nativeIsSelfIntersectingDiagnostic()})),twoManifold:s.nativeIs2ManifoldDiagnostic(),selfIntersecting:s.nativeIsSelfIntersectingDiagnostic(),epsilon:s.nativeEpsilonDiagnostic()};assert.equal(row.status,'NoError');assert(Math.abs(row.volume-volume)<1e-9);r.rows.push(row);console.log(JSON.stringify(row));}
   finally{parts.forEach(p=>p.delete());}
 }
 r.status='PASS_OBSERVATIONS';
}catch(e){r.status='FAIL';r.error={message:e.message,stack:e.stack};throw e;}
finally{for(const s of[...objects])free(s);r.retainedWrappers=objects.size;fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n');}
