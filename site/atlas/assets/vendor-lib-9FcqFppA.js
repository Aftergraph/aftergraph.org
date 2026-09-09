import{r as b,g as x}from"./vendor-react-W1izUqcL.js";function V(e){if(typeof e=="string"||typeof e=="number")return""+e;let r="";if(Array.isArray(e))for(let t=0,o;t<e.length;t++)(o=V(e[t]))!==""&&(r+=(r&&" ")+o);else for(let t in e)e[t]&&(r+=(r&&" ")+t);return r}var h={exports:{}},w={},$={exports:{}},j={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var c=b;function g(e,r){return e===r&&(e!==0||1/e===1/r)||e!==e&&r!==r}var D=typeof Object.is=="function"?Object.is:g,R=c.useState,O=c.useEffect,z=c.useLayoutEffect,I=c.useDebugValue;function M(e,r){var t=r(),o=R({inst:{value:t,getSnapshot:r}}),u=o[0].inst,n=o[1];return z(function(){u.value=t,u.getSnapshot=r,E(u)&&n({inst:u})},[e,t,r]),O(function(){return E(u)&&n({inst:u}),e(function(){E(u)&&n({inst:u})})},[e]),I(t),t}function E(e){var r=e.getSnapshot;e=e.value;try{var t=r();return!D(e,t)}catch{return!0}}function _(e,r){return r()}var k=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?_:M;j.useSyncExternalStore=c.useSyncExternalStore!==void 0?c.useSyncExternalStore:k;$.exports=j;var A=$.exports;/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var d=b,C=A;function G(e,r){return e===r&&(e!==0||1/e===1/r)||e!==e&&r!==r}var L=typeof Object.is=="function"?Object.is:G,F=C.useSyncExternalStore,U=d.useRef,W=d.useEffect,B=d.useMemo,H=d.useDebugValue;w.useSyncExternalStoreWithSelector=function(e,r,t,o,u){var n=U(null);if(n.current===null){var a={hasValue:!1,value:null};n.current=a}else a=n.current;n=B(function(){function S(f){if(!p){if(p=!0,l=f,f=o(f),u!==void 0&&a.hasValue){var i=a.value;if(u(i,f))return v=i}return v=f}if(i=v,L(l,f))return i;var m=o(f);return u!==void 0&&u(i,m)?(l=f,i):(l=f,v=m)}var p=!1,l,v,y=t===void 0?null:t;return[function(){return S(r())},y===null?void 0:function(){return S(y())}]},[r,t,o,u]);var s=F(e,n[0],n[1]);return W(function(){a.hasValue=!0,a.value=s},[s]),H(s),s};h.exports=w;var J=h.exports;const N=x(J);export{V as c,N as u};
