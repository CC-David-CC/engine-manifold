// Same compiled native library as the experimental bindings, without Float32 export.
#include "manifold/manifold.h"
#include <cmath>
#include <cstring>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <vector>
using manifold::Manifold;
using manifold::MeshGL64;
using manifold::vec3;
void require(bool condition) { if (!condition) throw std::runtime_error("preservation probe assertion failed"); }
template <class T> bool same(const std::vector<T>& a,const std::vector<T>& b) {
  return a.size()==b.size() && (a.empty() || std::memcmp(a.data(),b.data(),a.size()*sizeof(T))==0);
}
bool same(const MeshGL64& a,const MeshGL64& b) {
  return a.numProp==b.numProp &&
    std::memcmp(&a.tolerance,&b.tolerance,sizeof(double))==0 &&
    same(a.vertProperties,b.vertProperties) && same(a.triVerts,b.triVerts) &&
    same(a.mergeFromVert,b.mergeFromVert) && same(a.mergeToVert,b.mergeToVert) &&
    same(a.runIndex,b.runIndex) && same(a.runOriginalID,b.runOriginalID) &&
    same(a.runTransform,b.runTransform) && same(a.faceID,b.faceID) &&
    same(a.halfedgeTangent,b.halfedgeTangent);
}
struct Snapshot {
  MeshGL64 mesh;
  double volume, tolerance, epsilon;
  explicit Snapshot(const Manifold& s): mesh(s.GetMeshGL64()),volume(s.Volume()),
    tolerance(s.GetTolerance()),epsilon(s.NativeEpsilonDiagnostic()) {}
  bool unchanged(const Manifold& s) const {
    return same(mesh,s.GetMeshGL64()) && volume==s.Volume() &&
      tolerance==s.GetTolerance() && epsilon==s.NativeEpsilonDiagnostic();
  }
};
Manifold box(vec3 o,vec3 d=vec3(10,10,10)) { return Manifold::Cube(d).Translate(o); }
int main() {
 try {
  auto a=box(vec3(0.0)),b=box(vec3(5,0,0));
  auto outer=box(vec3(0.0),vec3(30)),notch=box(vec3(-1),vec3(11));
  std::vector<Manifold> shapes={a,b,a+b,a+box(vec3(10,0,0)),
    a+box(vec3(10,10,0)),a+box(vec3(10)),a+box(vec3(20,0,0)),
    a-box(vec3(4),vec3(2)), a-a};
  auto notched=outer-notch;
  for(auto o:{vec3(12),vec3(10),vec3(10,10,5),vec3(10,5,5)}) shapes.push_back(notched-box(o));
  auto first=outer-box(vec3(5));
  for(auto o:{vec3(17),vec3(15),vec3(15,15,5)}) shapes.push_back(first-box(o));
  int snapshots=0,pairs=0;
  for(const auto& s:shapes) {
    Snapshot before(s);
    (void)s.NativeIs2ManifoldDiagnostic(); (void)s.NativeIsSelfIntersectingDiagnostic();
    (void)s.NativeEpsilonDiagnostic(); require(before.unchanged(s)); ++snapshots;
    auto parts=s.Decompose();
    for(const auto& p:parts) {
      Snapshot pBefore(p);
      (void)p.NativeIs2ManifoldDiagnostic(); (void)p.NativeIsSelfIntersectingDiagnostic();
      require(pBefore.unchanged(p)); ++snapshots;
    }
    for(size_t i=0;i<parts.size();++i) for(size_t j=i+1;j<parts.size();++j) {
      Snapshot left(parts[i]),right(parts[j]);
      auto distance=parts[i].NativeBoundaryMinGapDiagnostic(parts[j],100);
      require(std::isfinite(distance)&&distance>=0&&distance<=100);
      (void)parts[j].NativeBoundaryMinGapDiagnostic(parts[i],100);
      require(left.unchanged(parts[i])&&right.unchanged(parts[j])); ++pairs;
    }
    require(before.unchanged(s));
  }
  Snapshot beforeA(a),beforeB(b);
  for(double search:{0.0,-1.0,std::numeric_limits<double>::infinity(),std::numeric_limits<double>::quiet_NaN()})
    require(std::isnan(a.NativeBoundaryMinGapDiagnostic(b,search)));
  require(beforeA.unchanged(a)&&beforeB.unchanged(b));
  std::cout<<"{\"status\":\"PASS\",\"shapes\":"<<shapes.size()
    <<",\"bitwiseMeshGL64Snapshots\":"<<snapshots<<",\"twoInputPreservedPairs\":"<<pairs
    <<",\"invalidSearchControls\":4,\"scope\":\"same native archive, exact double MeshGL64 arrays and reported scalars; no app or Join certificate\"}\n";
  return 0;
 } catch(const std::exception& e) { std::cerr<<e.what()<<'\n';return 1; }
}
