import{r as I,g as M}from"./vendor-react-R-jt2cbE.js";function U(e){if(typeof e=="string"||typeof e=="number")return""+e;let f="";if(Array.isArray(e))for(let o=0,v;o<e.length;o++)(v=U(e[o]))!==""&&(f+=(f&&" ")+v);else for(let o in e)e[o]&&(f+=(f&&" ")+o);return f}var R={exports:{}},w={},x={exports:{}},j={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var D;function k(){if(D)return j;D=1;var e=I();function f(r,t){return r===t&&(r!==0||1/r===1/t)||r!==r&&t!==t}var o=typeof Object.is=="function"?Object.is:f,v=e.useState,m=e.useEffect,y=e.useLayoutEffect,E=e.useDebugValue;function b(r,t){var n=t(),i=v({inst:{value:n,getSnapshot:t}}),u=i[0].inst,s=i[1];return y(function(){u.value=n,u.getSnapshot=t,S(u)&&s({inst:u})},[r,n,t]),m(function(){return S(u)&&s({inst:u}),r(function(){S(u)&&s({inst:u})})},[r]),E(n),n}function S(r){var t=r.getSnapshot;r=r.value;try{var n=t();return!o(r,n)}catch{return!0}}function c(r,t){return t()}var a=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?c:b;return j.useSyncExternalStore=e.useSyncExternalStore!==void 0?e.useSyncExternalStore:a,j}var W;function A(){return W||(W=1,x.exports=k()),x.exports}/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var O;function C(){if(O)return w;O=1;var e=I(),f=A();function o(c,a){return c===a&&(c!==0||1/c===1/a)||c!==c&&a!==a}var v=typeof Object.is=="function"?Object.is:o,m=f.useSyncExternalStore,y=e.useRef,E=e.useEffect,b=e.useMemo,S=e.useDebugValue;return w.useSyncExternalStoreWithSelector=function(c,a,r,t,n){var i=y(null);if(i.current===null){var u={hasValue:!1,value:null};i.current=u}else u=i.current;i=b(function(){function V(l){if(!_){if(_=!0,h=l,l=t(l),n!==void 0&&u.hasValue){var d=u.value;if(n(d,l))return p=d}return p=l}if(d=p,v(h,l))return d;var q=t(l);return n!==void 0&&n(d,q)?(h=l,d):(h=l,p=q)}var _=!1,h,p,g=r===void 0?null:r;return[function(){return V(a())},g===null?void 0:function(){return V(g())}]},[a,r,t,n]);var s=m(c,i[0],i[1]);return E(function(){u.hasValue=!0,u.value=s},[s]),S(s),s},w}var z;function G(){return z||(z=1,R.exports=C()),R.exports}var L=G();const F=M(L);export{U as c,F as u};
