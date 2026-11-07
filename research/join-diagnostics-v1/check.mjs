// Offline recorded arithmetic/limits checker; no fresh native execution.
import fs from 'node:fs';import assert from 'node:assert/strict';
const dir=new URL('./evidence/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,dir)));
const observed=read('observed-r2.json'), boundary=read('same-boundary.json'), preservation=read('preservation.json');
assert.equal(observed.status,'PASS_DIAGNOSTICS');assert.equal(boundary.status,'PASS_OBSERVATIONS');assert.equal(preservation.status,'PASS');
assert.equal(observed.retainedWrappers,0);assert.equal(boundary.retainedWrappers,0);
const rows=new Map(observed.rows.map(r=>[r.id,r]));assert.equal(rows.size,18);
const close=(a,b)=>assert(Math.abs(a-b)<=1e-10,`${a} != ${b}`);
for(const [id,v]of[['box',1000],['overlap',1500],['face-contact',2000],['edge-contact',2000],['point-contact',2000],['disjoint',2000],['proper-cavity',1000-8],['through-hole',1000-2*2*10],['separated-cavity',27000-1000-1000],['cavity-to-exterior-point-contact',25000],['cavity-to-exterior-edge-contact',25000],['cavity-open-to-exterior-face',25000],['two-separated-voids',25000],['two-point-touching-voids',25000],['two-edge-touching-voids',25000],['warped-coincident-nonadjacent-corners',1000/3],['warped-crossing-corner',0],['empty',0]]){
 const row=rows.get(id);assert(row);assert.equal(row.status,'NoError');close(row.volume,v);
}
for(const [id,gap]of[['proper-cavity',4],['separated-cavity',Math.sqrt(12)],['cavity-to-exterior-point-contact',0],['cavity-to-exterior-edge-contact',0],['edge-contact',0],['point-contact',0],['disjoint',10]]){
 const d=rows.get(id).componentDistance;close(d.forward,gap);close(d.reverse,gap);close(d.clipped,Math.min(1,gap));
}
assert.equal(rows.get('separated-cavity').componentDistance.publicGap,0);
for(const [id,gap]of[['two-separated-voids',Math.sqrt(12)],['two-point-touching-voids',0],['two-edge-touching-voids',0]])close(rows.get(id).voidDistance.forward,gap);
for(const id of ['cavity-to-exterior-point-contact','cavity-to-exterior-edge-contact','warped-coincident-nonadjacent-corners']){
 assert.equal(rows.get(id).diagnostics.oriented2Manifold,true);assert.equal(rows.get(id).diagnostics.selfIntersecting,false);
}
assert.equal(rows.get('warped-crossing-corner').diagnostics.selfIntersecting,true);
assert.equal(rows.get('empty').epsilon,-1);
assert.equal(observed.invalidSearchAndEmptyBoundary.controls.length,4);assert.equal(observed.invalidSearchAndEmptyBoundary.emptyDirections,3);
assert.equal(boundary.rows.length,3);
for(const [i,v]of [[0,27000-15**3-14**3],[1,27000-2*15**3],[2,27000-15**3-15*15*30]]){
 const row=boundary.rows[i];assert.equal(row.status,'NoError');close(row.volume,v);assert.equal(row.components.length,1);assert(row.components[0].volume>0);assert.equal(row.twoManifold,true);assert.equal(row.selfIntersecting,false);
}
assert.equal(preservation.shapes,16);assert.equal(preservation.bitwiseMeshGL64Snapshots,44);assert.equal(preservation.twoInputPreservedPairs,16);assert.equal(preservation.invalidSearchControls,4);
console.log(JSON.stringify({status:'PASS',nativeObservationRows:21,geometryRows:18,withinSingleBoundaryCounterexamples:2,exactDoubleSnapshots:44,scope:'Offline recorded evidence only; strict Join remains unqualified'}));
