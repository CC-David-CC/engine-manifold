// Genuine native WASM diagnostics. This is NOT an app, Worker, or Join certificate.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const env = name => { assert(process.env[name], `${name} required`); return process.env[name]; };
const glue = env('CODI_MANIFOLD_GLUE'), wasmPath = env('CODI_MANIFOLD_WASM');
const out = env('CODI_OBSERVATION'), pins = JSON.parse(fs.readFileSync(env('CODI_NATIVE_PINS')));
assert(!fs.existsSync(out), 'preserve existing receipts');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const js = fs.readFileSync(glue), wasm = fs.readFileSync(wasmPath);
assert.equal(sha(js), pins.jsSha256); assert.equal(sha(wasm), pins.wasmSha256);
const M = await (await import(pathToFileURL(glue))).default({wasmBinary: wasm});
M.setup();
const owned = new Set();
const own = shape => { owned.add(shape); return shape; };
const release = shape => { shape.delete(); owned.delete(shape); assert(shape.isDeleted()); };
const box = (origin = [0,0,0], dimensions = [10,10,10]) => {
  const initial = own(M.Manifold.cube(dimensions, false));
  try { return own(initial.translate(origin)); } finally { release(initial); }
};
const approximately = (actual, expected) => assert(Math.abs(actual - expected) <= 1e-10, `${actual} != ${expected}`);
const record = {status:'RUNNING', scope:'Actual native WASM in Node; diagnostic only, no Join/public app qualification',
  pins, producerSha256:sha(fs.readFileSync(new URL(import.meta.url))), rows:[], preservationChecks:0};

function snapshot(shape) {
  const mesh = shape.getMesh();
  const arrays = ['triVerts','vertProperties','mergeFromVert','mergeToVert','runIndex','runOriginalID','runTransform','faceID','halfedgeTangent'];
  const fields = {};
  for (const name of arrays) if (mesh[name] != null) {
    const a = mesh[name];
    fields[name] = {length:a.length, sha256:sha(Buffer.from(a.buffer,a.byteOffset,a.byteLength))};
  }
  return {status:shape.status(), empty:shape.isEmpty(), volume:shape.volume(),
    vertices:shape.numVert(), edges:shape.numEdge(), triangles:shape.numTri(),
    genus:shape.genus(), tolerance:shape.tolerance(), epsilon:shape.nativeEpsilonDiagnostic(),
    bounds:shape.isEmpty()?null:shape.boundingBox(), mesh:{numProp:mesh.numProp,fields}};
}
function diagnostic(shape) {
  const before = snapshot(shape);
  const observations = {oriented2Manifold:shape.nativeIs2ManifoldDiagnostic(),
    selfIntersecting:shape.nativeIsSelfIntersectingDiagnostic(), epsilon:shape.nativeEpsilonDiagnostic()};
  assert.equal(typeof observations.oriented2Manifold,'boolean');
  assert.equal(typeof observations.selfIntersecting,'boolean');
  // Native empty Impl uses its retained negative sentinel, not a positive size.
  assert(Number.isFinite(observations.epsilon));
  if (!before.empty) assert(observations.epsilon >= 0);
  assert.deepEqual(snapshot(shape),before); record.preservationChecks++;
  return {...before,diagnostics:observations};
}
function pair(a,b,expected) {
  const beforeA = snapshot(a), beforeB = snapshot(b);
  const forward = a.nativeBoundaryMinGapDiagnostic(b,100);
  const reverse = b.nativeBoundaryMinGapDiagnostic(a,100);
  approximately(forward,expected); approximately(reverse,expected);
  const clipped = a.nativeBoundaryMinGapDiagnostic(b,1);
  approximately(clipped,Math.min(1,expected));
  const publicGap = a.minGap(b,100);
  assert.deepEqual(snapshot(a),beforeA); assert.deepEqual(snapshot(b),beforeB);
  record.preservationChecks += 2;
  return {forward,reverse,clipped,publicGap};
}
function inspect(id,shape,expectedVolume,pairExpected=null,extra={}) {
  const row = {id,...extra,...diagnostic(shape),components:[]};
  assert.equal(row.status,'NoError'); approximately(row.volume,expectedVolume);
  const parts = shape.decompose();
  try {
    row.components = parts.map(diagnostic);
    if(pairExpected !== null) { assert.equal(parts.length,2); row.componentDistance = pair(parts[0],parts[1],pairExpected); }
  } finally { parts.forEach(p=>p.delete()); }
  record.rows.push(row); console.log(id, row.volume, row.diagnostics, row.componentDistance ?? '');
  return row;
}

try {
  const a = box(); inspect('box',a,1000);
  for(const [id,origin,expected,parts] of [
    ['overlap',[5,0,0],1500,1],['face-contact',[10,0,0],2000,1],
    ['edge-contact',[10,10,0],2000,2],['point-contact',[10,10,10],2000,2],
    ['disjoint',[20,0,0],2000,2]]) {
    const b=box(origin), u=own(a.add(b));
    const row=inspect(id,u,expected,parts===2?(id==='disjoint'?10:0):null);
    assert.equal(row.components.length,parts); release(u); release(b);
  }
  const inner=box([4,4,4],[2,2,2]), cavity=own(a.subtract(inner));
  inspect('proper-cavity',cavity,992,4);
  const throughTool=box([4,4,-1],[2,2,12]);
  inspect('through-hole',own(a.subtract(throughTool)),960);
  const outer=box([0,0,0],[30,30,30]), notch=box([-1,-1,-1],[11,11,11]);
  const notched=own(outer.subtract(notch));
  for(const [id,origin,distance] of [
    ['separated-cavity',[12,12,12],Math.sqrt(12)],
    ['cavity-to-exterior-point-contact',[10,10,10],0],
    ['cavity-to-exterior-edge-contact',[10,10,5],0],
    ['cavity-open-to-exterior-face',[10,5,5],null]]) {
    const tool=box(origin,[10,10,10]);
    inspect(id,own(notched.subtract(tool)),25000,distance,{source:{outer:[30,30,30],notchOrigin:[-1,-1,-1],notchDimensions:[11,11,11],toolOrigin:origin,toolDimensions:[10,10,10]}});
  }
  const firstVoid=box([5,5,5],[10,10,10]);
  const firstCut=own(outer.subtract(firstVoid));
  for(const [id,origin,expectedDistance] of [
    ['two-separated-voids',[17,17,17],Math.sqrt(12)],
    ['two-point-touching-voids',[15,15,15],0],
    ['two-edge-touching-voids',[15,15,5],0]]) {
    const tool=box(origin,[10,10,10]); const shape=own(firstCut.subtract(tool));
    const row=inspect(id,shape,25000,null,{source:{firstVoidOrigin:[5,5,5],secondVoidOrigin:origin}});
    const parts=shape.decompose();
    try {const voids=parts.filter(p=>p.volume()<0); assert.equal(voids.length,2); row.voidDistance=pair(voids[0],voids[1],expectedDistance);}
    finally{parts.forEach(p=>p.delete());}
  }
  for(const [id,target,expectedVolume] of [
    ['warped-coincident-nonadjacent-corners',[0,0,0],1000/3],
    ['warped-crossing-corner',[-5,-5,-5],0]]) {
    const warped=own(a.warp(v=>{if(v[0]===10&&v[1]===10&&v[2]===10)for(let i=0;i<3;i++)v[i]=target[i];}));
    inspect(id,warped,expectedVolume,null,{outsidePublicConstructionScope:true,warp:{from:[10,10,10],to:target}});
  }
  const empty=own(a.subtract(a)); inspect('empty',empty,0);
  const beforeA=snapshot(a),beforeEmpty=snapshot(empty), invalid=[];
  for(const value of [0,-1,Infinity,NaN]) {const result=a.nativeBoundaryMinGapDiagnostic(a,value); assert(Number.isNaN(result));invalid.push({searchLength:String(value),result:'NaN'});}
  for(const [x,y] of [[a,empty],[empty,a],[empty,empty]]) assert(Number.isNaN(x.nativeBoundaryMinGapDiagnostic(y,100)));
  assert.deepEqual(snapshot(a),beforeA);assert.deepEqual(snapshot(empty),beforeEmpty);
  record.preservationChecks+=2;record.invalidSearchAndEmptyBoundary={controls:invalid,emptyDirections:3};
  record.status='PASS_DIAGNOSTICS';
} catch(error) { record.status='FAIL';record.error={message:error.message,stack:error.stack};throw error; }
finally {for(const shape of [...owned])release(shape);record.retainedWrappers=owned.size;fs.writeFileSync(out,JSON.stringify(record,null,2)+'\n');}
