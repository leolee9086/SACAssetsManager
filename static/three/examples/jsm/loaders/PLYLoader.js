/* esm.sh - esbuild bundle(three@0.169.0/examples/jsm/loaders/PLYLoader) es2022 production */
import{BufferGeometry as b,FileLoader as j,Float32BufferAttribute as h,Loader as U,Color as G,SRGBColorSpace as P}from"../../../three.mjs";var f=new G,_=class extends U{constructor(u){super(u),this.propertyNameMapping={},this.customPropertyMapping={}}load(u,C,x,y){let R=this,d=new j(this.manager);d.setPath(this.path),d.setResponseType("arraybuffer"),d.setRequestHeader(this.requestHeader),d.setWithCredentials(this.withCredentials),d.load(u,function(z){try{C(R.parse(z))}catch(v){y?y(v):console.error(v),R.manager.itemError(u)}},x,y)}setPropertyNameMapping(u){this.propertyNameMapping=u}setCustomPropertyNameMapping(u){this.customPropertyMapping=u}parse(u){function C(e,n=0){let r=/^ply([\s\S]*)end_header(\r\n|\r|\n)/,t="",s=r.exec(e);s!==null&&(t=s[1]);let o={comments:[],elements:[],headerLength:n,objInfo:""},a=t.split(/\r\n|\r|\n/),i;function m(c,p){let l={type:c[0]};return l.type==="list"?(l.name=c[3],l.countType=c[1],l.itemType=c[2]):l.name=c[1],l.name in p&&(l.name=p[l.name]),l}for(let c=0;c<a.length;c++){let p=a[c];if(p=p.trim(),p==="")continue;let l=p.split(/\s+/),N=l.shift();switch(p=l.join(" "),N){case"format":o.format=l[0],o.version=l[1];break;case"comment":o.comments.push(p);break;case"element":i!==void 0&&o.elements.push(i),i={},i.name=l[0],i.count=parseInt(l[1]),i.properties=[];break;case"property":i.properties.push(m(l,g.propertyNameMapping));break;case"obj_info":o.objInfo=p;break;default:console.log("unhandled",N,l)}}return i!==void 0&&o.elements.push(i),o}function x(e,n){switch(n){case"char":case"uchar":case"short":case"ushort":case"int":case"uint":case"int8":case"uint8":case"int16":case"uint16":case"int32":case"uint32":return parseInt(e);case"float":case"double":case"float32":case"float64":return parseFloat(e)}}function y(e,n){let r={};for(let t=0;t<e.length;t++){if(n.empty())return null;if(e[t].type==="list"){let s=[],o=x(n.next(),e[t].countType);for(let a=0;a<o;a++){if(n.empty())return null;s.push(x(n.next(),e[t].itemType))}r[e[t].name]=s}else r[e[t].name]=x(n.next(),e[t].type)}return r}function R(){let e={indices:[],vertices:[],normals:[],uvs:[],faceVertexUvs:[],colors:[],faceVertexColors:[]};for(let n of Object.keys(g.customPropertyMapping))e[n]=[];return e}function d(e){let n=e.map(t=>t.name);function r(t){for(let s=0,o=t.length;s<o;s++){let a=t[s];if(n.includes(a))return a}return null}return{attrX:r(["x","px","posx"])||"x",attrY:r(["y","py","posy"])||"y",attrZ:r(["z","pz","posz"])||"z",attrNX:r(["nx","normalx"]),attrNY:r(["ny","normaly"]),attrNZ:r(["nz","normalz"]),attrS:r(["s","u","texture_u","tx"]),attrT:r(["t","v","texture_v","ty"]),attrR:r(["red","diffuse_red","r","diffuse_r"]),attrG:r(["green","diffuse_green","g","diffuse_g"]),attrB:r(["blue","diffuse_blue","b","diffuse_b"])}}function z(e,n){let r=R(),t=/end_header\s+(\S[\s\S]*\S|\S)\s*$/,s,o;(o=t.exec(e))!==null?s=o[1].split(/\s+/):s=[];let a=new T(s);e:for(let i=0;i<n.elements.length;i++){let m=n.elements[i],c=d(m.properties);for(let p=0;p<m.count;p++){let l=y(m.properties,a);if(!l)break e;I(r,m.name,l,c)}}return v(r)}function v(e){let n=new b;e.indices.length>0&&n.setIndex(e.indices),n.setAttribute("position",new h(e.vertices,3)),e.normals.length>0&&n.setAttribute("normal",new h(e.normals,3)),e.uvs.length>0&&n.setAttribute("uv",new h(e.uvs,2)),e.colors.length>0&&n.setAttribute("color",new h(e.colors,3)),(e.faceVertexUvs.length>0||e.faceVertexColors.length>0)&&(n=n.toNonIndexed(),e.faceVertexUvs.length>0&&n.setAttribute("uv",new h(e.faceVertexUvs,2)),e.faceVertexColors.length>0&&n.setAttribute("color",new h(e.faceVertexColors,3)));for(let r of Object.keys(g.customPropertyMapping))e[r].length>0&&n.setAttribute(r,new h(e[r],g.customPropertyMapping[r].length));return n.computeBoundingSphere(),n}function I(e,n,r,t){if(n==="vertex"){e.vertices.push(r[t.attrX],r[t.attrY],r[t.attrZ]),t.attrNX!==null&&t.attrNY!==null&&t.attrNZ!==null&&e.normals.push(r[t.attrNX],r[t.attrNY],r[t.attrNZ]),t.attrS!==null&&t.attrT!==null&&e.uvs.push(r[t.attrS],r[t.attrT]),t.attrR!==null&&t.attrG!==null&&t.attrB!==null&&(f.setRGB(r[t.attrR]/255,r[t.attrG]/255,r[t.attrB]/255,P),e.colors.push(f.r,f.g,f.b));for(let s of Object.keys(g.customPropertyMapping))for(let o of g.customPropertyMapping[s])e[s].push(r[o])}else if(n==="face"){let s=r.vertex_indices||r.vertex_index,o=r.texcoord;s.length===3?(e.indices.push(s[0],s[1],s[2]),o&&o.length===6&&(e.faceVertexUvs.push(o[0],o[1]),e.faceVertexUvs.push(o[2],o[3]),e.faceVertexUvs.push(o[4],o[5]))):s.length===4&&(e.indices.push(s[0],s[1],s[3]),e.indices.push(s[1],s[2],s[3])),t.attrR!==null&&t.attrG!==null&&t.attrB!==null&&(f.setRGB(r[t.attrR]/255,r[t.attrG]/255,r[t.attrB]/255,P),e.faceVertexColors.push(f.r,f.g,f.b),e.faceVertexColors.push(f.r,f.g,f.b),e.faceVertexColors.push(f.r,f.g,f.b))}}function A(e,n){let r={},t=0;for(let s=0;s<n.length;s++){let o=n[s],a=o.valueReader;if(o.type==="list"){let i=[],m=o.countReader.read(e+t);t+=o.countReader.size;for(let c=0;c<m;c++)i.push(a.read(e+t)),t+=a.size;r[o.name]=i}else r[o.name]=a.read(e+t),t+=a.size}return[r,t]}function S(e,n,r){function t(s,o,a){switch(o){case"int8":case"char":return{read:i=>s.getInt8(i),size:1};case"uint8":case"uchar":return{read:i=>s.getUint8(i),size:1};case"int16":case"short":return{read:i=>s.getInt16(i,a),size:2};case"uint16":case"ushort":return{read:i=>s.getUint16(i,a),size:2};case"int32":case"int":return{read:i=>s.getInt32(i,a),size:4};case"uint32":case"uint":return{read:i=>s.getUint32(i,a),size:4};case"float32":case"float":return{read:i=>s.getFloat32(i,a),size:4};case"float64":case"double":return{read:i=>s.getFloat64(i,a),size:8}}}for(let s=0,o=e.length;s<o;s++){let a=e[s];a.type==="list"?(a.countReader=t(n,a.countType,r),a.valueReader=t(n,a.itemType,r)):a.valueReader=t(n,a.type,r)}}function M(e,n){let r=R(),t=n.format==="binary_little_endian",s=new DataView(e,n.headerLength),o,a=0;for(let i=0;i<n.elements.length;i++){let m=n.elements[i],c=m.properties,p=d(c);S(c,s,t);for(let l=0;l<m.count;l++){o=A(a,c),a+=o[1];let N=o[0];I(r,m.name,N,p)}}return v(r)}function V(e){let n=0,r=!0,t="",s=[],o=new TextDecoder().decode(e.subarray(0,5)),a=/^ply\r\n/.test(o);do{let i=String.fromCharCode(e[n++]);i!==`
    `&&i!=="\r"?t+=i:(t==="end_header"&&(r=!1),t!==""&&(s.push(t),t=""))}while(r&&n<e.length);return a===!0&&n++,{headerText:s.join("\r")+"\r",headerLength:n}}let B,g=this;if(u instanceof ArrayBuffer){let e=new Uint8Array(u),{headerText:n,headerLength:r}=V(e),t=C(n,r);if(t.format==="ascii"){let s=new TextDecoder().decode(e);B=z(s,t)}else B=M(u,t)}else B=z(u,C(u));return B}},T=class{constructor(u){this.arr=u,this.i=0}empty(){return this.i>=this.arr.length}next(){return this.arr[this.i++]}};export{_ as PLYLoader};
    //# sourceMappingURL=PLYLoader.js.map