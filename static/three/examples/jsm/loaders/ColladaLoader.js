/* esm.sh - esbuild bundle(three@0.169.0/examples/jsm/loaders/ColladaLoader) es2022 production */
import{AmbientLight as kn,AnimationClip as Oe,Bone as Nn,BufferGeometry as wn,ClampToEdgeWrapping as Re,Color as qe,ColorManagement as Y,DirectionalLight as An,DoubleSide as Tn,FileLoader as Cn,Float32BufferAttribute as R,FrontSide as En,Group as Pe,Line as xn,LineBasicMaterial as Ue,LineSegments as vn,Loader as Be,LoaderUtils as _n,MathUtils as G,Matrix4 as I,Mesh as Ln,MeshBasicMaterial as De,MeshLambertMaterial as Mn,MeshPhongMaterial as He,OrthographicCamera as Sn,PerspectiveCamera as Ve,PointLight as In,Quaternion as jn,QuaternionKeyframeTrack as On,RepeatWrapping as Q,Scene as Rn,Skeleton as qn,SkinnedMesh as Pn,SpotLight as Un,TextureLoader as Bn,Vector2 as Dn,Vector3 as j,VectorKeyframeTrack as Fe,SRGBColorSpace as O}from"../../../three.mjs";import{TGALoader as Ge}from"./TGALoader.js";var Ke=class extends Be{load(q,K,C,V){let N=this,P=N.path===""?_n.extractUrlBase(q):N.path,w=new Cn(N.manager);w.setPath(N.path),w.setRequestHeader(N.requestHeader),w.setWithCredentials(N.withCredentials),w.load(q,function($){try{K(N.parse($,P))}catch(U){V?V(U):console.error(U),N.manager.itemError(q)}},C,V)}parse(q,K){function C(t,e){let i=[],n=t.childNodes;for(let s=0,a=n.length;s<a;s++){let o=n[s];o.nodeName===e&&i.push(o)}return i}function V(t){if(t.length===0)return[];let e=t.trim().split(/\s+/),i=new Array(e.length);for(let n=0,s=e.length;n<s;n++)i[n]=e[n];return i}function N(t){if(t.length===0)return[];let e=t.trim().split(/\s+/),i=new Array(e.length);for(let n=0,s=e.length;n<s;n++)i[n]=parseFloat(e[n]);return i}function P(t){if(t.length===0)return[];let e=t.trim().split(/\s+/),i=new Array(e.length);for(let n=0,s=e.length;n<s;n++)i[n]=parseInt(e[n]);return i}function w(t){return t.substring(1)}function $(){return"three_default_"+bn++}function U(t){return Object.keys(t).length===0}function We(t){return{unit:Je(C(t,"unit")[0]),upAxis:ze(C(t,"up_axis")[0])}}function Je(t){return t!==void 0&&t.hasAttribute("meter")===!0?parseFloat(t.getAttribute("meter")):1}function ze(t){return t!==void 0?t.textContent:"Y_UP"}function E(t,e,i,n){let s=C(t,e)[0];if(s!==void 0){let a=C(s,i);for(let o=0;o<a.length;o++)n(a[o])}}function M(t,e){for(let i in t){let n=t[i];n.build=e(t[i])}}function v(t,e){return t.build!==void 0||(t.build=e(t)),t.build}function se(t){let e={sources:{},samplers:{},channels:{}},i=!1;for(let n=0,s=t.childNodes.length;n<s;n++){let a=t.childNodes[n];if(a.nodeType!==1)continue;let o;switch(a.nodeName){case"source":o=a.getAttribute("id"),e.sources[o]=ee(a);break;case"sampler":o=a.getAttribute("id"),e.samplers[o]=Xe(a);break;case"channel":o=a.getAttribute("target"),e.channels[o]=Ze(a);break;case"animation":se(a),i=!0;break;default:console.log(a)}}i===!1&&(g.animations[t.getAttribute("id")||G.generateUUID()]=e)}function Xe(t){let e={inputs:{}};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"input":let a=w(s.getAttribute("source")),o=s.getAttribute("semantic");e.inputs[o]=a;break}}return e}function Ze(t){let e={},n=t.getAttribute("target").split("/"),s=n.shift(),a=n.shift(),o=a.indexOf("(")!==-1,d=a.indexOf(".")!==-1;if(d)n=a.split("."),a=n.shift(),e.member=n.shift();else if(o){let c=a.split("(");a=c.shift();for(let l=0;l<c.length;l++)c[l]=parseInt(c[l].replace(/\)/,""));e.indices=c}return e.id=s,e.sid=a,e.arraySyntax=o,e.memberSyntax=d,e.sampler=w(t.getAttribute("source")),e}function ae(t){let e=[],i=t.channels,n=t.samplers,s=t.sources;for(let a in i)if(i.hasOwnProperty(a)){let o=i[a],d=n[o.sampler],c=d.inputs.INPUT,l=d.inputs.OUTPUT,h=s[c],r=s[l],f=Ye(o,h,r);$e(f,e)}return e}function oe(t){return v(g.animations[t],ae)}function Ye(t,e,i){let n=g.nodes[t.id],s=D(n.id),a=n.transforms[t.sid],o=n.matrix.clone().transpose(),d,c,l,h,r,f,u={};switch(a){case"matrix":for(l=0,h=e.array.length;l<h;l++)if(d=e.array[l],c=l*i.stride,u[d]===void 0&&(u[d]={}),t.arraySyntax===!0){let A=i.array[c],k=t.indices[0]+4*t.indices[1];u[d][k]=A}else for(r=0,f=i.stride;r<f;r++)u[d][r]=i.array[c+r];break;case"translate":console.warn('THREE.ColladaLoader: Animation transform type "%s" not yet implemented.',a);break;case"rotate":console.warn('THREE.ColladaLoader: Animation transform type "%s" not yet implemented.',a);break;case"scale":console.warn('THREE.ColladaLoader: Animation transform type "%s" not yet implemented.',a);break}let p=Qe(u,o);return{name:s.uuid,keyframes:p}}function Qe(t,e){let i=[];for(let s in t)i.push({time:parseFloat(s),value:t[s]});i.sort(n);for(let s=0;s<16;s++)et(i,s,e.elements[s]);return i;function n(s,a){return s.time-a.time}}let W=new j,J=new j,F=new jn;function $e(t,e){let i=t.keyframes,n=t.name,s=[],a=[],o=[],d=[];for(let c=0,l=i.length;c<l;c++){let h=i[c],r=h.time,f=h.value;_.fromArray(f).transpose(),_.decompose(W,F,J),s.push(r),a.push(W.x,W.y,W.z),o.push(F.x,F.y,F.z,F.w),d.push(J.x,J.y,J.z)}return a.length>0&&e.push(new Fe(n+".position",s,a)),o.length>0&&e.push(new On(n+".quaternion",s,o)),d.length>0&&e.push(new Fe(n+".scale",s,d)),e}function et(t,e,i){let n,s=!0,a,o;for(a=0,o=t.length;a<o;a++)n=t[a],n.value[e]===void 0?n.value[e]=null:s=!1;if(s===!0)for(a=0,o=t.length;a<o;a++)n=t[a],n.value[e]=i;else tt(t,e)}function tt(t,e){let i,n;for(let s=0,a=t.length;s<a;s++){let o=t[s];if(o.value[e]===null){if(i=nt(t,s,e),n=it(t,s,e),i===null){o.value[e]=n.value[e];continue}if(n===null){o.value[e]=i.value[e];continue}st(o,i,n,e)}}}function nt(t,e,i){for(;e>=0;){let n=t[e];if(n.value[i]!==null)return n;e--}return null}function it(t,e,i){for(;e<t.length;){let n=t[e];if(n.value[i]!==null)return n;e++}return null}function st(t,e,i,n){if(i.time-e.time===0){t.value[n]=e.value[n];return}t.value[n]=(t.time-e.time)*(i.value[n]-e.value[n])/(i.time-e.time)+e.value[n]}function at(t){let e={name:t.getAttribute("id")||"default",start:parseFloat(t.getAttribute("start")||0),end:parseFloat(t.getAttribute("end")||0),animations:[]};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"instance_animation":e.animations.push(w(s.getAttribute("url")));break}}g.clips[t.getAttribute("id")]=e}function re(t){let e=[],i=t.name,n=t.end-t.start||-1,s=t.animations;for(let a=0,o=s.length;a<o;a++){let d=oe(s[a]);for(let c=0,l=d.length;c<l;c++)e.push(d[c])}return new Oe(i,n,e)}function ot(t){return v(g.clips[t],re)}function rt(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"skin":e.id=w(s.getAttribute("source")),e.skin=ct(s);break;case"morph":e.id=w(s.getAttribute("source")),console.warn("THREE.ColladaLoader: Morph target animation not supported yet.");break}}g.controllers[t.getAttribute("id")]=e}function ct(t){let e={sources:{}};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"bind_shape_matrix":e.bindShapeMatrix=N(s.textContent);break;case"source":let a=s.getAttribute("id");e.sources[a]=ee(s);break;case"joints":e.joints=lt(s);break;case"vertex_weights":e.vertexWeights=dt(s);break}}return e}function lt(t){let e={inputs:{}};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"input":let a=s.getAttribute("semantic"),o=w(s.getAttribute("source"));e.inputs[a]=o;break}}return e}function dt(t){let e={inputs:{}};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"input":let a=s.getAttribute("semantic"),o=w(s.getAttribute("source")),d=parseInt(s.getAttribute("offset"));e.inputs[a]={id:o,offset:d};break;case"vcount":e.vcount=P(s.textContent);break;case"v":e.v=P(s.textContent);break}}return e}function ce(t){let e={id:t.id},i=g.geometries[e.id];return t.skin!==void 0&&(e.skin=ut(t.skin),i.sources.skinIndices=e.skin.indices,i.sources.skinWeights=e.skin.weights),e}function ut(t){let i={joints:[],indices:{array:[],stride:4},weights:{array:[],stride:4}},n=t.sources,s=t.vertexWeights,a=s.vcount,o=s.v,d=s.inputs.JOINT.offset,c=s.inputs.WEIGHT.offset,l=t.sources[t.joints.inputs.JOINT],h=t.sources[t.joints.inputs.INV_BIND_MATRIX],r=n[s.inputs.WEIGHT.id].array,f=0,u,p,m;for(u=0,m=a.length;u<m;u++){let k=a[u],b=[];for(p=0;p<k;p++){let y=o[f+d],S=o[f+c],x=r[S];b.push({index:y,weight:x}),f+=2}for(b.sort(A),p=0;p<4;p++){let y=b[p];y!==void 0?(i.indices.array.push(y.index),i.weights.array.push(y.weight)):(i.indices.array.push(0),i.weights.array.push(0))}}for(t.bindShapeMatrix?i.bindMatrix=new I().fromArray(t.bindShapeMatrix).transpose():i.bindMatrix=new I().identity(),u=0,m=l.array.length;u<m;u++){let k=l.array[u],b=new I().fromArray(h.array,u*h.stride).transpose();i.joints.push({name:k,boneInverse:b})}return i;function A(k,b){return b.weight-k.weight}}function ft(t){return v(g.controllers[t],ce)}function ht(t){let e={init_from:C(t,"init_from")[0].textContent};g.images[t.getAttribute("id")]=e}function le(t){return t.build!==void 0?t.build:t.init_from}function de(t){let e=g.images[t];return e!==void 0?v(e,le):(console.warn("THREE.ColladaLoader: Couldn't find image with ID:",t),null)}function mt(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"profile_COMMON":e.profile=pt(s);break}}g.effects[t.getAttribute("id")]=e}function pt(t){let e={surfaces:{},samplers:{}};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"newparam":gt(s,e);break;case"technique":e.technique=kt(s);break;case"extra":e.extra=he(s);break}}return e}function gt(t,e){let i=t.getAttribute("sid");for(let n=0,s=t.childNodes.length;n<s;n++){let a=t.childNodes[n];if(a.nodeType===1)switch(a.nodeName){case"surface":e.surfaces[i]=bt(a);break;case"sampler2D":e.samplers[i]=yt(a);break}}}function bt(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"init_from":e.init_from=s.textContent;break}}return e}function yt(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"source":e.source=s.textContent;break}}return e}function kt(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"constant":case"lambert":case"blinn":case"phong":e.type=s.nodeName,e.parameters=Nt(s);break;case"extra":e.extra=he(s);break}}return e}function Nt(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"emission":case"diffuse":case"specular":case"bump":case"ambient":case"shininess":case"transparency":e[s.nodeName]=ue(s);break;case"transparent":e[s.nodeName]={opaque:s.hasAttribute("opaque")?s.getAttribute("opaque"):"A_ONE",data:ue(s)};break}}return e}function ue(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"color":e[s.nodeName]=N(s.textContent);break;case"float":e[s.nodeName]=parseFloat(s.textContent);break;case"texture":e[s.nodeName]={id:s.getAttribute("texture"),extra:fe(s)};break}}return e}function fe(t){let e={technique:{}};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"extra":wt(s,e);break}}return e}function wt(t,e){for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"technique":At(s,e);break}}}function At(t,e){for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"repeatU":case"repeatV":case"offsetU":case"offsetV":e.technique[s.nodeName]=parseFloat(s.textContent);break;case"wrapU":case"wrapV":s.textContent.toUpperCase()==="TRUE"?e.technique[s.nodeName]=1:s.textContent.toUpperCase()==="FALSE"?e.technique[s.nodeName]=0:e.technique[s.nodeName]=parseInt(s.textContent);break;case"bump":e[s.nodeName]=me(s);break}}}function he(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"technique":e.technique=Tt(s);break}}return e}function Tt(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"double_sided":e[s.nodeName]=parseInt(s.textContent);break;case"bump":e[s.nodeName]=me(s);break}}return e}function me(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"texture":e[s.nodeName]={id:s.getAttribute("texture"),texcoord:s.getAttribute("texcoord"),extra:fe(s)};break}}return e}function pe(t){return t}function Ct(t){return v(g.effects[t],pe)}function Et(t){let e={name:t.getAttribute("name")};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"instance_effect":e.url=w(s.getAttribute("url"));break}}g.materials[t.getAttribute("id")]=e}function xt(t){let e,i=t.slice((t.lastIndexOf(".")-1>>>0)+2);switch(i=i.toLowerCase(),i){case"tga":e=ie;break;default:e=Se}return e}function ge(t){let e=Ct(t.url),i=e.profile.technique,n;switch(i.type){case"phong":case"blinn":n=new He;break;case"lambert":n=new Mn;break;default:n=new De;break}n.name=t.name||"";function s(c,l=null){let h=e.profile.samplers[c.id],r=null;if(h!==void 0){let f=e.profile.surfaces[h.source];r=de(f.init_from)}else console.warn("THREE.ColladaLoader: Undefined sampler. Access image directly (see #12530)."),r=de(c.id);if(r!==null){let f=xt(r);if(f!==void 0){let u=f.load(r),p=c.extra;if(p!==void 0&&p.technique!==void 0&&U(p.technique)===!1){let m=p.technique;u.wrapS=m.wrapU?Q:Re,u.wrapT=m.wrapV?Q:Re,u.offset.set(m.offsetU||0,m.offsetV||0),u.repeat.set(m.repeatU||1,m.repeatV||1)}else u.wrapS=Q,u.wrapT=Q;return l!==null&&(u.colorSpace=l),u}else return console.warn("THREE.ColladaLoader: Loader for texture %s not found.",r),null}else return console.warn("THREE.ColladaLoader: Couldn't create texture with ID:",c.id),null}let a=i.parameters;for(let c in a){let l=a[c];switch(c){case"diffuse":l.color&&n.color.fromArray(l.color),l.texture&&(n.map=s(l.texture,O));break;case"specular":l.color&&n.specular&&n.specular.fromArray(l.color),l.texture&&(n.specularMap=s(l.texture));break;case"bump":l.texture&&(n.normalMap=s(l.texture));break;case"ambient":l.texture&&(n.lightMap=s(l.texture,O));break;case"shininess":l.float&&n.shininess&&(n.shininess=l.float);break;case"emission":l.color&&n.emissive&&n.emissive.fromArray(l.color),l.texture&&(n.emissiveMap=s(l.texture,O));break}}Y.toWorkingColorSpace(n.color,O),n.specular&&Y.toWorkingColorSpace(n.specular,O),n.emissive&&Y.toWorkingColorSpace(n.emissive,O);let o=a.transparent,d=a.transparency;if(d===void 0&&o&&(d={float:1}),o===void 0&&d&&(o={opaque:"A_ONE",data:{color:[1,1,1,1]}}),o&&d)if(o.data.texture)n.transparent=!0;else{let c=o.data.color;switch(o.opaque){case"A_ONE":n.opacity=c[3]*d.float;break;case"RGB_ZERO":n.opacity=1-c[0]*d.float;break;case"A_ZERO":n.opacity=1-c[3]*d.float;break;case"RGB_ONE":n.opacity=c[0]*d.float;break;default:console.warn('THREE.ColladaLoader: Invalid opaque type "%s" of transparent tag.',o.opaque)}n.opacity<1&&(n.transparent=!0)}if(i.extra!==void 0&&i.extra.technique!==void 0){let c=i.extra.technique;for(let l in c){let h=c[l];switch(l){case"double_sided":n.side=h===1?Tn:En;break;case"bump":n.normalMap=s(h.texture),n.normalScale=new Dn(1,1);break}}}return n}function vt(t){return v(g.materials[t],ge)}function _t(t){let e={name:t.getAttribute("name")};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"optics":e.optics=Lt(s);break}}g.cameras[t.getAttribute("id")]=e}function Lt(t){for(let e=0;e<t.childNodes.length;e++){let i=t.childNodes[e];switch(i.nodeName){case"technique_common":return Mt(i)}}return{}}function Mt(t){let e={};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];switch(n.nodeName){case"perspective":case"orthographic":e.technique=n.nodeName,e.parameters=St(n);break}}return e}function St(t){let e={};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];switch(n.nodeName){case"xfov":case"yfov":case"xmag":case"ymag":case"znear":case"zfar":case"aspect_ratio":e[n.nodeName]=parseFloat(n.textContent);break}}return e}function be(t){let e;switch(t.optics.technique){case"perspective":e=new Ve(t.optics.parameters.yfov,t.optics.parameters.aspect_ratio,t.optics.parameters.znear,t.optics.parameters.zfar);break;case"orthographic":let i=t.optics.parameters.ymag,n=t.optics.parameters.xmag,s=t.optics.parameters.aspect_ratio;n=n===void 0?i*s:n,i=i===void 0?n/s:i,n*=.5,i*=.5,e=new Sn(-n,n,i,-i,t.optics.parameters.znear,t.optics.parameters.zfar);break;default:e=new Ve;break}return e.name=t.name||"",e}function It(t){let e=g.cameras[t];return e!==void 0?v(e,be):(console.warn("THREE.ColladaLoader: Couldn't find camera with ID:",t),null)}function jt(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"technique_common":e=Ot(s);break}}g.lights[t.getAttribute("id")]=e}function Ot(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"directional":case"point":case"spot":case"ambient":e.technique=s.nodeName,e.parameters=Rt(s)}}return e}function Rt(t){let e={};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"color":let a=N(s.textContent);e.color=new qe().fromArray(a),Y.toWorkingColorSpace(e.color,O);break;case"falloff_angle":e.falloffAngle=parseFloat(s.textContent);break;case"quadratic_attenuation":let o=parseFloat(s.textContent);e.distance=o?Math.sqrt(1/o):0;break}}return e}function ye(t){let e;switch(t.technique){case"directional":e=new An;break;case"point":e=new In;break;case"spot":e=new Un;break;case"ambient":e=new kn;break}return t.parameters.color&&e.color.copy(t.parameters.color),t.parameters.distance&&(e.distance=t.parameters.distance),e}function qt(t){let e=g.lights[t];return e!==void 0?v(e,ye):(console.warn("THREE.ColladaLoader: Couldn't find light with ID:",t),null)}function Pt(t){let e={name:t.getAttribute("name"),sources:{},vertices:{},primitives:[]},i=C(t,"mesh")[0];if(i!==void 0){for(let n=0;n<i.childNodes.length;n++){let s=i.childNodes[n];if(s.nodeType!==1)continue;let a=s.getAttribute("id");switch(s.nodeName){case"source":e.sources[a]=ee(s);break;case"vertices":e.vertices=Ut(s);break;case"polygons":console.warn("THREE.ColladaLoader: Unsupported primitive type: ",s.nodeName);break;case"lines":case"linestrips":case"polylist":case"triangles":e.primitives.push(Bt(s));break;default:console.log(s)}}g.geometries[t.getAttribute("id")]=e}}function ee(t){let e={array:[],stride:3};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"float_array":e.array=N(n.textContent);break;case"Name_array":e.array=V(n.textContent);break;case"technique_common":let s=C(n,"accessor")[0];s!==void 0&&(e.stride=parseInt(s.getAttribute("stride")));break}}return e}function Ut(t){let e={};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];n.nodeType===1&&(e[n.getAttribute("semantic")]=w(n.getAttribute("source")))}return e}function Bt(t){let e={type:t.nodeName,material:t.getAttribute("material"),count:parseInt(t.getAttribute("count")),inputs:{},stride:0,hasUV:!1};for(let i=0,n=t.childNodes.length;i<n;i++){let s=t.childNodes[i];if(s.nodeType===1)switch(s.nodeName){case"input":let a=w(s.getAttribute("source")),o=s.getAttribute("semantic"),d=parseInt(s.getAttribute("offset")),c=parseInt(s.getAttribute("set")),l=c>0?o+c:o;e.inputs[l]={id:a,offset:d},e.stride=Math.max(e.stride,d+1),o==="TEXCOORD"&&(e.hasUV=!0);break;case"vcount":e.vcount=P(s.textContent);break;case"p":e.p=P(s.textContent);break}}return e}function Dt(t){let e={};for(let i=0;i<t.length;i++){let n=t[i];e[n.type]===void 0&&(e[n.type]=[]),e[n.type].push(n)}return e}function Ht(t){let e=0;for(let i=0,n=t.length;i<n;i++)t[i].hasUV===!0&&e++;e>0&&e<t.length&&(t.uvsNeedsFix=!0)}function ke(t){let e={},i=t.sources,n=t.vertices,s=t.primitives;if(s.length===0)return{};let a=Dt(s);for(let o in a){let d=a[o];Ht(d),e[o]=Vt(d,i,n)}return e}function Vt(t,e,i){let n={},s={array:[],stride:0},a={array:[],stride:0},o={array:[],stride:0},d={array:[],stride:0},c={array:[],stride:0},l={array:[],stride:4},h={array:[],stride:4},r=new wn,f=[],u=0;for(let p=0;p<t.length;p++){let m=t[p],A=m.inputs,k=0;switch(m.type){case"lines":case"linestrips":k=m.count*2;break;case"triangles":k=m.count*3;break;case"polylist":for(let b=0;b<m.count;b++){let y=m.vcount[b];switch(y){case 3:k+=3;break;case 4:k+=6;break;default:k+=(y-2)*3;break}}break;default:console.warn("THREE.ColladaLoader: Unknow primitive type:",m.type)}r.addGroup(u,k,p),u+=k,m.material&&f.push(m.material);for(let b in A){let y=A[b];switch(b){case"VERTEX":for(let S in i){let x=i[S];switch(S){case"POSITION":let H=s.array.length;if(L(m,e[x],y.offset,s.array),s.stride=e[x].stride,e.skinWeights&&e.skinIndices&&(L(m,e.skinIndices,y.offset,l.array),L(m,e.skinWeights,y.offset,h.array)),m.hasUV===!1&&t.uvsNeedsFix===!0){let yn=(s.array.length-H)/s.stride;for(let je=0;je<yn;je++)o.array.push(0,0)}break;case"NORMAL":L(m,e[x],y.offset,a.array),a.stride=e[x].stride;break;case"COLOR":L(m,e[x],y.offset,c.array),c.stride=e[x].stride;break;case"TEXCOORD":L(m,e[x],y.offset,o.array),o.stride=e[x].stride;break;case"TEXCOORD1":L(m,e[x],y.offset,d.array),o.stride=e[x].stride;break;default:console.warn('THREE.ColladaLoader: Semantic "%s" not handled in geometry build process.',S)}}break;case"NORMAL":L(m,e[y.id],y.offset,a.array),a.stride=e[y.id].stride;break;case"COLOR":L(m,e[y.id],y.offset,c.array,!0),c.stride=e[y.id].stride;break;case"TEXCOORD":L(m,e[y.id],y.offset,o.array),o.stride=e[y.id].stride;break;case"TEXCOORD1":L(m,e[y.id],y.offset,d.array),d.stride=e[y.id].stride;break}}}return s.array.length>0&&r.setAttribute("position",new R(s.array,s.stride)),a.array.length>0&&r.setAttribute("normal",new R(a.array,a.stride)),c.array.length>0&&r.setAttribute("color",new R(c.array,c.stride)),o.array.length>0&&r.setAttribute("uv",new R(o.array,o.stride)),d.array.length>0&&r.setAttribute("uv1",new R(d.array,d.stride)),l.array.length>0&&r.setAttribute("skinIndex",new R(l.array,l.stride)),h.array.length>0&&r.setAttribute("skinWeight",new R(h.array,h.stride)),n.data=r,n.type=t[0].type,n.materialKeys=f,n}function L(t,e,i,n,s=!1){let a=t.p,o=t.stride,d=t.vcount;function c(r){let f=a[r+i]*h,u=f+h;for(;f<u;f++)n.push(l[f]);if(s){let p=n.length-h-1;z.setRGB(n[p+0],n[p+1],n[p+2],O),n[p+0]=z.r,n[p+1]=z.g,n[p+2]=z.b}}let l=e.array,h=e.stride;if(t.vcount!==void 0){let r=0;for(let f=0,u=d.length;f<u;f++){let p=d[f];if(p===4){let m=r+o*0,A=r+o*1,k=r+o*2,b=r+o*3;c(m),c(A),c(b),c(A),c(k),c(b)}else if(p===3){let m=r+o*0,A=r+o*1,k=r+o*2;c(m),c(A),c(k)}else if(p>4)for(let m=1,A=p-2;m<=A;m++){let k=r+o*0,b=r+o*m,y=r+o*(m+1);c(k),c(b),c(y)}r+=o*p}}else for(let r=0,f=a.length;r<f;r+=o)c(r)}function Ne(t){return v(g.geometries[t],ke)}function Ft(t){let e={name:t.getAttribute("name")||"",joints:{},links:[]};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"technique_common":Wt(n,e);break}}g.kinematicsModels[t.getAttribute("id")]=e}function Gt(t){return t.build!==void 0?t.build:t}function Kt(t){return v(g.kinematicsModels[t],Gt)}function Wt(t,e){for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"joint":e.joints[n.getAttribute("sid")]=Jt(n);break;case"link":e.links.push(we(n));break}}}function Jt(t){let e;for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"prismatic":case"revolute":e=zt(n);break}}return e}function zt(t){let e={sid:t.getAttribute("sid"),name:t.getAttribute("name")||"",axis:new j,limits:{min:0,max:0},type:t.nodeName,static:!1,zeroPosition:0,middlePosition:0};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"axis":let s=N(n.textContent);e.axis.fromArray(s);break;case"limits":let a=n.getElementsByTagName("max")[0],o=n.getElementsByTagName("min")[0];e.limits.max=parseFloat(a.textContent),e.limits.min=parseFloat(o.textContent);break}}return e.limits.min>=e.limits.max&&(e.static=!0),e.middlePosition=(e.limits.min+e.limits.max)/2,e}function we(t){let e={sid:t.getAttribute("sid"),name:t.getAttribute("name")||"",attachments:[],transforms:[]};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"attachment_full":e.attachments.push(Xt(n));break;case"matrix":case"translate":case"rotate":e.transforms.push(Ae(n));break}}return e}function Xt(t){let e={joint:t.getAttribute("joint").split("/").pop(),transforms:[],links:[]};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"link":e.links.push(we(n));break;case"matrix":case"translate":case"rotate":e.transforms.push(Ae(n));break}}return e}function Ae(t){let e={type:t.nodeName},i=N(t.textContent);switch(e.type){case"matrix":e.obj=new I,e.obj.fromArray(i).transpose();break;case"translate":e.obj=new j,e.obj.fromArray(i);break;case"rotate":e.obj=new j,e.obj.fromArray(i),e.angle=G.degToRad(i[3]);break}return e}function Zt(t){let e={name:t.getAttribute("name")||"",rigidBodies:{}};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"rigid_body":e.rigidBodies[n.getAttribute("name")]={},Yt(n,e.rigidBodies[n.getAttribute("name")]);break}}g.physicsModels[t.getAttribute("id")]=e}function Yt(t,e){for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"technique_common":Qt(n,e);break}}}function Qt(t,e){for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"inertia":e.inertia=N(n.textContent);break;case"mass":e.mass=N(n.textContent)[0];break}}}function $t(t){let e={bindJointAxis:[]};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"bind_joint_axis":e.bindJointAxis.push(en(n));break}}g.kinematicsScenes[w(t.getAttribute("url"))]=e}function en(t){let e={target:t.getAttribute("target").split("/").pop()};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType===1)switch(n.nodeName){case"axis":let s=n.getElementsByTagName("param")[0];e.axis=s.textContent;let a=e.axis.split("inst_").pop().split("axis")[0];e.jointIndex=a.substring(0,a.length-1);break}}return e}function tn(t){return t.build!==void 0?t.build:t}function nn(t){return v(g.kinematicsScenes[t],tn)}function sn(){let t=Object.keys(g.kinematicsModels)[0],e=Object.keys(g.kinematicsScenes)[0],i=Object.keys(g.visualScenes)[0];if(t===void 0||e===void 0)return;let n=Kt(t),s=nn(e),a=_e(i),o=s.bindJointAxis,d={};for(let h=0,r=o.length;h<r;h++){let f=o[h],u=T.querySelector('[sid="'+f.target+'"]');if(u){let p=u.parentElement;c(f.jointIndex,p)}}function c(h,r){let f=r.getAttribute("name"),u=n.joints[h];a.traverse(function(p){p.name===f&&(d[h]={object:p,transforms:an(r),joint:u,position:u.zeroPosition})})}let l=new I;Ie={joints:n&&n.joints,getJointValue:function(h){let r=d[h];if(r)return r.position;console.warn("THREE.ColladaLoader: Joint "+h+" doesn't exist.")},setJointValue:function(h,r){let f=d[h];if(f){let u=f.joint;if(r>u.limits.max||r<u.limits.min)console.warn("THREE.ColladaLoader: Joint "+h+" value "+r+" outside of limits (min: "+u.limits.min+", max: "+u.limits.max+").");else if(u.static)console.warn("THREE.ColladaLoader: Joint "+h+" is static.");else{let p=f.object,m=u.axis,A=f.transforms;_.identity();for(let k=0;k<A.length;k++){let b=A[k];if(b.sid&&b.sid.indexOf(h)!==-1)switch(u.type){case"revolute":_.multiply(l.makeRotationAxis(m,G.degToRad(r)));break;case"prismatic":_.multiply(l.makeTranslation(m.x*r,m.y*r,m.z*r));break;default:console.warn("THREE.ColladaLoader: Unknown joint type: "+u.type);break}else switch(b.type){case"matrix":_.multiply(b.obj);break;case"translate":_.multiply(l.makeTranslation(b.obj.x,b.obj.y,b.obj.z));break;case"scale":_.scale(b.obj);break;case"rotate":_.multiply(l.makeRotationAxis(b.obj,b.angle));break}}p.matrix.copy(_),p.matrix.decompose(p.position,p.quaternion,p.scale),d[h].position=r}}else console.log("THREE.ColladaLoader: "+h+" does not exist.")}}}function an(t){let e=[],i=T.querySelector('[id="'+t.id+'"]');for(let n=0;n<i.childNodes.length;n++){let s=i.childNodes[n];if(s.nodeType!==1)continue;let a,o;switch(s.nodeName){case"matrix":a=N(s.textContent);let d=new I().fromArray(a).transpose();e.push({sid:s.getAttribute("sid"),type:s.nodeName,obj:d});break;case"translate":case"scale":a=N(s.textContent),o=new j().fromArray(a),e.push({sid:s.getAttribute("sid"),type:s.nodeName,obj:o});break;case"rotate":a=N(s.textContent),o=new j().fromArray(a);let c=G.degToRad(a[3]);e.push({sid:s.getAttribute("sid"),type:s.nodeName,obj:o,angle:c});break}}return e}function on(t){let e=t.getElementsByTagName("node");for(let i=0;i<e.length;i++){let n=e[i];n.hasAttribute("id")===!1&&n.setAttribute("id",$())}}let _=new I,B=new j;function te(t){let e={name:t.getAttribute("name")||"",type:t.getAttribute("type"),id:t.getAttribute("id"),sid:t.getAttribute("sid"),matrix:new I,nodes:[],instanceCameras:[],instanceControllers:[],instanceLights:[],instanceGeometries:[],instanceNodes:[],transforms:{}};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];if(n.nodeType!==1)continue;let s;switch(n.nodeName){case"node":e.nodes.push(n.getAttribute("id")),te(n);break;case"instance_camera":e.instanceCameras.push(w(n.getAttribute("url")));break;case"instance_controller":e.instanceControllers.push(Te(n));break;case"instance_light":e.instanceLights.push(w(n.getAttribute("url")));break;case"instance_geometry":e.instanceGeometries.push(Te(n));break;case"instance_node":e.instanceNodes.push(w(n.getAttribute("url")));break;case"matrix":s=N(n.textContent),e.matrix.multiply(_.fromArray(s).transpose()),e.transforms[n.getAttribute("sid")]=n.nodeName;break;case"translate":s=N(n.textContent),B.fromArray(s),e.matrix.multiply(_.makeTranslation(B.x,B.y,B.z)),e.transforms[n.getAttribute("sid")]=n.nodeName;break;case"rotate":s=N(n.textContent);let a=G.degToRad(s[3]);e.matrix.multiply(_.makeRotationAxis(B.fromArray(s),a)),e.transforms[n.getAttribute("sid")]=n.nodeName;break;case"scale":s=N(n.textContent),e.matrix.scale(B.fromArray(s)),e.transforms[n.getAttribute("sid")]=n.nodeName;break;case"extra":break;default:console.log(n)}}return xe(e.id)?console.warn("THREE.ColladaLoader: There is already a node with ID %s. Exclude current node from further processing.",e.id):g.nodes[e.id]=e,e}function Te(t){let e={id:w(t.getAttribute("url")),materials:{},skeletons:[]};for(let i=0;i<t.childNodes.length;i++){let n=t.childNodes[i];switch(n.nodeName){case"bind_material":let s=n.getElementsByTagName("instance_material");for(let a=0;a<s.length;a++){let o=s[a],d=o.getAttribute("symbol"),c=o.getAttribute("target");e.materials[d]=w(c)}break;case"skeleton":e.skeletons.push(w(n.textContent));break;default:break}}return e}function rn(t,e){let i=[],n=[],s,a,o;for(s=0;s<t.length;s++){let l=t[s],h;if(xe(l))h=D(l),Ce(h,e,i);else if(fn(l)){let f=g.visualScenes[l].children;for(let u=0;u<f.length;u++){let p=f[u];if(p.type==="JOINT"){let m=D(p.id);Ce(m,e,i)}}}else console.error("THREE.ColladaLoader: Unable to find root bone of skeleton with ID:",l)}for(s=0;s<e.length;s++)for(a=0;a<i.length;a++)if(o=i[a],o.bone.name===e[s].name){n[s]=o,o.processed=!0;break}for(s=0;s<i.length;s++)o=i[s],o.processed===!1&&(n.push(o),o.processed=!0);let d=[],c=[];for(s=0;s<n.length;s++)o=n[s],d.push(o.bone),c.push(o.boneInverse);return new qn(d,c)}function Ce(t,e,i){t.traverse(function(n){if(n.isBone===!0){let s;for(let a=0;a<e.length;a++){let o=e[a];if(o.name===n.name){s=o.boneInverse;break}}s===void 0&&(s=new I),i.push({bone:n,boneInverse:s,processed:!1})}})}function cn(t){let e=[],i=t.matrix,n=t.nodes,s=t.type,a=t.instanceCameras,o=t.instanceControllers,d=t.instanceLights,c=t.instanceGeometries,l=t.instanceNodes;for(let r=0,f=n.length;r<f;r++)e.push(D(n[r]));for(let r=0,f=a.length;r<f;r++){let u=It(a[r]);u!==null&&e.push(u.clone())}for(let r=0,f=o.length;r<f;r++){let u=o[r],p=ft(u.id),m=Ne(p.id),A=Ee(m,u.materials),k=u.skeletons,b=p.skin.joints,y=rn(k,b);for(let S=0,x=A.length;S<x;S++){let H=A[S];H.isSkinnedMesh&&(H.bind(y,p.skin.bindMatrix),H.normalizeSkinWeights()),e.push(H)}}for(let r=0,f=d.length;r<f;r++){let u=qt(d[r]);u!==null&&e.push(u.clone())}for(let r=0,f=c.length;r<f;r++){let u=c[r],p=Ne(u.id),m=Ee(p,u.materials);for(let A=0,k=m.length;A<k;A++)e.push(m[A])}for(let r=0,f=l.length;r<f;r++)e.push(D(l[r]).clone());let h;if(n.length===0&&e.length===1)h=e[0];else{h=s==="JOINT"?new Nn:new Pe;for(let r=0;r<e.length;r++)h.add(e[r])}return h.name=s==="JOINT"?t.sid:t.name,h.matrix.copy(i),h.matrix.decompose(h.position,h.quaternion,h.scale),h}let ln=new De({name:Be.DEFAULT_MATERIAL_NAME,color:16711935});function dn(t,e){let i=[];for(let n=0,s=t.length;n<s;n++){let a=e[t[n]];a===void 0?(console.warn("THREE.ColladaLoader: Material with key %s not found. Apply fallback material.",t[n]),i.push(ln)):i.push(vt(a))}return i}function Ee(t,e){let i=[];for(let n in t){let s=t[n],a=dn(s.materialKeys,e);if(a.length===0&&(n==="lines"||n==="linestrips"?a.push(new Ue):a.push(new He)),n==="lines"||n==="linestrips")for(let l=0,h=a.length;l<h;l++){let r=a[l];if(r.isMeshPhongMaterial===!0||r.isMeshLambertMaterial===!0){let f=new Ue;f.color.copy(r.color),f.opacity=r.opacity,f.transparent=r.transparent,a[l]=f}}let o=s.data.attributes.skinIndex!==void 0,d=a.length===1?a[0]:a,c;switch(n){case"lines":c=new vn(s.data,d);break;case"linestrips":c=new xn(s.data,d);break;case"triangles":case"polylist":o?c=new Pn(s.data,d):c=new Ln(s.data,d);break}i.push(c)}return i}function xe(t){return g.nodes[t]!==void 0}function D(t){return v(g.nodes[t],cn)}function un(t){let e={name:t.getAttribute("name"),children:[]};on(t);let i=C(t,"node");for(let n=0;n<i.length;n++)e.children.push(te(i[n]));g.visualScenes[t.getAttribute("id")]=e}function ve(t){let e=new Pe;e.name=t.name;let i=t.children;for(let n=0;n<i.length;n++){let s=i[n];e.add(D(s.id))}return e}function fn(t){return g.visualScenes[t]!==void 0}function _e(t){return v(g.visualScenes[t],ve)}function hn(t){let e=C(t,"instance_visual_scene")[0];return _e(w(e.getAttribute("url")))}function mn(){let t=g.clips;if(U(t)===!0){if(U(g.animations)===!1){let e=[];for(let i in g.animations){let n=oe(i);for(let s=0,a=n.length;s<a;s++)e.push(n[s])}X.push(new Oe("default",-1,e))}}else for(let e in t)X.push(ot(e))}function pn(t){let e="",i=[t];for(;i.length;){let n=i.shift();n.nodeType===Node.TEXT_NODE?e+=n.textContent:(e+=`
    `,i.push.apply(i,n.childNodes))}return e.trim()}if(q.length===0)return{scene:new Rn};let Le=new DOMParser().parseFromString(q,"application/xml"),T=C(Le,"COLLADA")[0],ne=Le.getElementsByTagName("parsererror")[0];if(ne!==void 0){let t=C(ne,"div")[0],e;return t?e=t.textContent:e=pn(ne),console.error(`THREE.ColladaLoader: Failed to parse collada file.
    `,e),null}let gn=T.getAttribute("version");console.debug("THREE.ColladaLoader: File version",gn);let Me=We(C(T,"asset")[0]),Se=new Bn(this.manager);Se.setPath(this.resourcePath||K).setCrossOrigin(this.crossOrigin);let ie;Ge&&(ie=new Ge(this.manager),ie.setPath(this.resourcePath||K));let z=new qe,X=[],Ie={},bn=0,g={animations:{},clips:{},controllers:{},images:{},effects:{},materials:{},cameras:{},lights:{},geometries:{},nodes:{},visualScenes:{},kinematicsModels:{},physicsModels:{},kinematicsScenes:{}};E(T,"library_animations","animation",se),E(T,"library_animation_clips","animation_clip",at),E(T,"library_controllers","controller",rt),E(T,"library_images","image",ht),E(T,"library_effects","effect",mt),E(T,"library_materials","material",Et),E(T,"library_cameras","camera",_t),E(T,"library_lights","light",jt),E(T,"library_geometries","geometry",Pt),E(T,"library_nodes","node",te),E(T,"library_visual_scenes","visual_scene",un),E(T,"library_kinematics_models","kinematics_model",Ft),E(T,"library_physics_models","physics_model",Zt),E(T,"scene","instance_kinematics_scene",$t),M(g.animations,ae),M(g.clips,re),M(g.controllers,ce),M(g.images,le),M(g.effects,pe),M(g.materials,ge),M(g.cameras,be),M(g.lights,ye),M(g.geometries,ke),M(g.visualScenes,ve),mn(),sn();let Z=hn(C(T,"scene")[0]);return Z.animations=X,Me.upAxis==="Z_UP"&&(console.warn("THREE.ColladaLoader: You are loading an asset with a Z-UP coordinate system. The loader just rotates the asset to transform it into Y-UP. The vertex data are not converted, see #24289."),Z.rotation.set(-Math.PI/2,0,0)),Z.scale.multiplyScalar(Me.unit),{get animations(){return console.warn("THREE.ColladaLoader: Please access animations over scene.animations now."),X},kinematics:Ie,library:g,scene:Z}}};export{Ke as ColladaLoader};
    //# sourceMappingURL=ColladaLoader.js.map