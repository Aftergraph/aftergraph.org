(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // ../../../npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
  var __facade_middleware__ = [];
  function __facade_register__(...args) {
    __facade_middleware__.push(...args.flat());
  }
  __name(__facade_register__, "__facade_register__");
  function __facade_registerInternal__(...args) {
    __facade_middleware__.unshift(...args.flat());
  }
  __name(__facade_registerInternal__, "__facade_registerInternal__");
  function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
    const [head, ...tail] = middlewareChain;
    const middlewareCtx = {
      dispatch,
      next(newRequest, newEnv) {
        return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
      }
    };
    return head(request, env, ctx, middlewareCtx);
  }
  __name(__facade_invokeChain__, "__facade_invokeChain__");
  function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
    return __facade_invokeChain__(request, env, ctx, dispatch, [
      ...__facade_middleware__,
      finalMiddleware
    ]);
  }
  __name(__facade_invoke__, "__facade_invoke__");

  // ../../../npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/loader-sw.ts
  var __FACADE_EVENT_TARGET__;
  if (globalThis.MINIFLARE) {
    __FACADE_EVENT_TARGET__ = new (Object.getPrototypeOf(WorkerGlobalScope))();
  } else {
    __FACADE_EVENT_TARGET__ = new EventTarget();
  }
  function __facade_isSpecialEvent__(type) {
    return type === "fetch" || type === "scheduled";
  }
  __name(__facade_isSpecialEvent__, "__facade_isSpecialEvent__");
  var __facade__originalAddEventListener__ = globalThis.addEventListener;
  var __facade__originalRemoveEventListener__ = globalThis.removeEventListener;
  var __facade__originalDispatchEvent__ = globalThis.dispatchEvent;
  globalThis.addEventListener = function(type, listener, options) {
    if (__facade_isSpecialEvent__(type)) {
      __FACADE_EVENT_TARGET__.addEventListener(
        type,
        listener,
        options
      );
    } else {
      __facade__originalAddEventListener__(type, listener, options);
    }
  };
  globalThis.removeEventListener = function(type, listener, options) {
    if (__facade_isSpecialEvent__(type)) {
      __FACADE_EVENT_TARGET__.removeEventListener(
        type,
        listener,
        options
      );
    } else {
      __facade__originalRemoveEventListener__(type, listener, options);
    }
  };
  globalThis.dispatchEvent = function(event) {
    if (__facade_isSpecialEvent__(event.type)) {
      return __FACADE_EVENT_TARGET__.dispatchEvent(event);
    } else {
      return __facade__originalDispatchEvent__(event);
    }
  };
  globalThis.addMiddleware = __facade_register__;
  globalThis.addMiddlewareInternal = __facade_registerInternal__;
  var __facade_waitUntil__ = /* @__PURE__ */ Symbol("__facade_waitUntil__");
  var __facade_response__ = /* @__PURE__ */ Symbol("__facade_response__");
  var __facade_dispatched__ = /* @__PURE__ */ Symbol("__facade_dispatched__");
  var __Facade_ExtendableEvent__ = class ___Facade_ExtendableEvent__ extends Event {
    static {
      __name(this, "__Facade_ExtendableEvent__");
    }
    [__facade_waitUntil__] = [];
    waitUntil(promise) {
      if (!(this instanceof ___Facade_ExtendableEvent__)) {
        throw new TypeError("Illegal invocation");
      }
      this[__facade_waitUntil__].push(promise);
    }
  };
  var __Facade_FetchEvent__ = class ___Facade_FetchEvent__ extends __Facade_ExtendableEvent__ {
    static {
      __name(this, "__Facade_FetchEvent__");
    }
    #request;
    #passThroughOnException;
    [__facade_response__];
    [__facade_dispatched__] = false;
    constructor(type, init) {
      super(type);
      this.#request = init.request;
      this.#passThroughOnException = init.passThroughOnException;
    }
    get request() {
      return this.#request;
    }
    respondWith(response) {
      if (!(this instanceof ___Facade_FetchEvent__)) {
        throw new TypeError("Illegal invocation");
      }
      if (this[__facade_response__] !== void 0) {
        throw new DOMException(
          "FetchEvent.respondWith() has already been called; it can only be called once.",
          "InvalidStateError"
        );
      }
      if (this[__facade_dispatched__]) {
        throw new DOMException(
          "Too late to call FetchEvent.respondWith(). It must be called synchronously in the event handler.",
          "InvalidStateError"
        );
      }
      this.stopImmediatePropagation();
      this[__facade_response__] = response;
    }
    passThroughOnException() {
      if (!(this instanceof ___Facade_FetchEvent__)) {
        throw new TypeError("Illegal invocation");
      }
      this.#passThroughOnException();
    }
  };
  var __Facade_ScheduledEvent__ = class ___Facade_ScheduledEvent__ extends __Facade_ExtendableEvent__ {
    static {
      __name(this, "__Facade_ScheduledEvent__");
    }
    #scheduledTime;
    #cron;
    #noRetry;
    constructor(type, init) {
      super(type);
      this.#scheduledTime = init.scheduledTime;
      this.#cron = init.cron;
      this.#noRetry = init.noRetry;
    }
    get scheduledTime() {
      return this.#scheduledTime;
    }
    get cron() {
      return this.#cron;
    }
    noRetry() {
      if (!(this instanceof ___Facade_ScheduledEvent__)) {
        throw new TypeError("Illegal invocation");
      }
      this.#noRetry();
    }
  };
  __facade__originalAddEventListener__("fetch", (event) => {
    const ctx = {
      waitUntil: event.waitUntil.bind(event),
      passThroughOnException: event.passThroughOnException.bind(event)
    };
    const __facade_sw_dispatch__ = /* @__PURE__ */ __name(function(type, init) {
      if (type === "scheduled") {
        const facadeEvent = new __Facade_ScheduledEvent__("scheduled", {
          scheduledTime: Date.now(),
          cron: init.cron ?? "",
          noRetry() {
          }
        });
        __FACADE_EVENT_TARGET__.dispatchEvent(facadeEvent);
        event.waitUntil(Promise.all(facadeEvent[__facade_waitUntil__]));
      }
    }, "__facade_sw_dispatch__");
    const __facade_sw_fetch__ = /* @__PURE__ */ __name(function(request, _env, ctx2) {
      const facadeEvent = new __Facade_FetchEvent__("fetch", {
        request,
        passThroughOnException: ctx2.passThroughOnException
      });
      __FACADE_EVENT_TARGET__.dispatchEvent(facadeEvent);
      facadeEvent[__facade_dispatched__] = true;
      event.waitUntil(Promise.all(facadeEvent[__facade_waitUntil__]));
      const response = facadeEvent[__facade_response__];
      if (response === void 0) {
        throw new Error("No response!");
      }
      return response;
    }, "__facade_sw_fetch__");
    event.respondWith(
      __facade_invoke__(
        event.request,
        globalThis,
        ctx,
        __facade_sw_dispatch__,
        __facade_sw_fetch__
      )
    );
  });
  __facade__originalAddEventListener__("scheduled", (event) => {
    const facadeEvent = new __Facade_ScheduledEvent__("scheduled", {
      scheduledTime: event.scheduledTime,
      cron: event.cron,
      noRetry: event.noRetry.bind(event)
    });
    __FACADE_EVENT_TARGET__.dispatchEvent(facadeEvent);
    event.waitUntil(Promise.all(facadeEvent[__facade_waitUntil__]));
  });

  // ../../../npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
  var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
    try {
      return await middlewareCtx.next(request, env);
    } finally {
      try {
        if (request.body !== null && !request.bodyUsed) {
          const reader = request.body.getReader();
          while (!(await reader.read()).done) {
          }
        }
      } catch (e) {
        console.error("Failed to drain the unused request body.", e);
      }
    }
  }, "drainBody");
  var middleware_ensure_req_body_drained_default = drainBody;

  // ../../../npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
  function reduceError(e) {
    return {
      name: e?.name,
      message: e?.message ?? String(e),
      stack: e?.stack,
      cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
    };
  }
  __name(reduceError, "reduceError");
  var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
    try {
      return await middlewareCtx.next(request, env);
    } catch (e) {
      const error = reduceError(e);
      const body = JSON.stringify(error);
      const headers = {
        "Content-Type": "application/json",
        "MF-Experimental-Error-Stack": "true"
      };
      const encoded = encodeURIComponent(body);
      if (encoded.length <= 8192) {
        headers["MF-Experimental-Error-Stack-Payload"] = encoded;
      }
      return new Response(body, { status: 500, headers });
    }
  }, "jsonError");
  var middleware_miniflare3_json_error_default = jsonError;

  // .wrangler/tmp/bundle-f3VcVZ/middleware-insertion-facade.js
  __facade_registerInternal__([middleware_ensure_req_body_drained_default, middleware_miniflare3_json_error_default]);

  // worker.js
  var SECURE = {
    "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  };
  var LANDING = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Aftergraph \u2014 infrastructure and open research for verifiable intelligent systems.">
<title>Aftergraph \u2014 Verifiable Intelligent Systems</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23080c14'/><path d='M16 5l9 5v12l-9 5-9-5V10z' fill='none' stroke='%2342c7e8' stroke-width='2'/></svg>">
<link rel="icon" type="image/svg+xml" href="/favicon.ico">
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Aftergraph \u2014 Verifiable Intelligent Systems">
<meta property="og:description" content="Governed, durable and verifiable intelligent work: missions, authority, runtime enforcement, execution, evidence and independent verification.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/">
<meta property="og:image" content="https://aftergraph.org/og-image.svg">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Aftergraph">
<meta name="twitter:description" content="Governed, durable and verifiable intelligent work.">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Aftergraph","url":"https://aftergraph.org","description":"Infrastructure and open research for governed, durable and verifiable intelligent work.","sameAs":["https://github.com/Aftergraph"]}<\/script>
</head>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#0a0c12;color:#f2f4f8;font-family:Inter,"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-feature-settings:"cv01","ss03";-webkit-font-smoothing:antialiased;line-height:1.6}
a{color:#42c7e8;text-decoration:none}
a:hover{color:#8fe0f5}
/* ---- nav ---- */
.nav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:rgba(10,12,18,.82);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.05)}
.nav .brand{font-weight:600;letter-spacing:.02em;font-size:15px;color:#f2f4f8}
.nav .brand i{font-style:normal;color:#42c7e8}
.nav .links{display:flex;align-items:center;gap:28px}
.nav .links a{color:#9aa3b2;font-size:14px;font-weight:500}
.nav .links a:hover{color:#f2f4f8}
.nav .links .cta{background:#42c7e8;color:#0a0c12!important;padding:7px 16px;border-radius:6px;font-weight:600}
.nav .links .cta:hover{background:#64d5f0;color:#0a0c12!important}
/* ---- hero ---- */
.hero{max-width:1180px;margin:0 auto;padding:110px 40px 64px}
.hero h1{font-size:64px;line-height:1.02;letter-spacing:-1.6px;font-weight:500;margin:0 0 22px;max-width:900px;color:#f2f4f8}
.hero h1 em{font-style:normal;color:#24c4ad}
.hero .lede{font-size:19px;line-height:1.6;color:#9aa3b2;max-width:640px;margin:0 0 36px;font-weight:400}
.cta-row{display:flex;gap:14px;flex-wrap:wrap}
.btn{display:inline-block;padding:10px 20px;border-radius:6px;font-size:15px;font-weight:600;transition:all .18s}
.btn-p{background:#42c7e8;color:#0a0c12}
.btn-p:hover{background:#64d5f0;color:#0a0c12}
.btn-g{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);color:#d7dbe2}
.btn-g:hover{border-color:rgba(66,199,232,.4);color:#42c7e8}
/* ---- strip ---- */
.strips{max-width:1180px;margin:0 auto;padding:0 40px 8px;display:flex;flex-wrap:wrap;gap:8px 24px;border-top:1px solid rgba(255,255,255,.05);padding-top:20px}
.strip{font-size:13px;color:#7b8494;font-weight:500}
.strip b{color:#d7dbe2;font-weight:500}
.strip .dot{color:#24c4ad}
/* ---- sections ---- */
.section{max-width:1180px;margin:0 auto;padding:88px 40px}
.stitle{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#42c7e8;font-weight:500;margin:0 0 14px}
.sh2{font-size:44px;line-height:1.06;letter-spacing:-1.1px;font-weight:500;margin:0 0 18px;color:#f2f4f8}
.slede{font-size:17px;color:#9aa3b2;max-width:620px;margin:0 0 44px}
/* ---- evidence chain ---- */
.chain{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 8px}
.chain .node{border:1px solid rgba(66,199,232,.35);border-radius:6px;padding:7px 14px;font-size:14px;color:#d7dbe2;background:rgba(66,199,232,.05);font-weight:500}
.chain .node.dim{border-color:rgba(255,255,255,.08);color:#7b8494;background:transparent}
.chain .arr{color:#42c7e8;font-size:17px}
/* ---- products: WORKS f\xF8rst, derefter resten ---- */
.dispatch{display:grid;grid-template-columns:2fr 1fr;gap:18px;align-items:stretch}
.dispatch .prim{border:1px solid rgba(66,199,232,.28);background:rgba(66,199,232,.04);border-radius:12px;padding:30px}
.dispatch .prim h3{font-size:24px;margin:0 0 6px;font-weight:600;letter-spacing:-.3px;color:#f2f4f8}
.dispatch .prim .badge{margin-left:0}
.dispatch .aux{border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:24px;background:rgba(255,255,255,.015)}
.dispatch .aux h3{font-size:19px;margin:0 0 6px;font-weight:600;letter-spacing:-.2px;color:#f2f4f8}
.card-p{border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.015);border-radius:12px;padding:24px;display:flex;flex-direction:column;gap:10px}
.card-p h3{font-size:19px;margin:0;font-weight:600;letter-spacing:-.2px;color:#f2f4f8;display:flex;align-items:center;flex-wrap:wrap;gap:10px}
.card-p p{font-size:14px;line-height:1.6;color:#9aa3b2;margin:0}
.card-p .go{margin-top:auto;padding-top:14px}
.badge{display:inline-block;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase}
.b-pr{background:rgba(240,166,74,.14);color:#f0a64a;border:1px solid rgba(240,166,74,.3)}
.b-r{background:rgba(136,145,160,.13);color:#98a2b3;border:1px solid rgba(136,145,160,.3)}
.b-p{background:rgba(36,196,173,.14);color:#24c4ad;border:1px solid rgba(36,196,173,.3)}
.grid{border-top:1px solid rgba(255,255,255,.05);padding-top:18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px;margin-top:18px}
/* ---- research ---- */
.res{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
.res .r{border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.015);border-radius:12px;padding:22px}
.res .r h4{margin:0 0 4px;font-size:17px;font-weight:600;letter-spacing:-.2px;color:#f2f4f8}
.res .r .meta{font-size:12px;color:#7b8494;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.res .r p{margin:0;font-size:14px;color:#9aa3b2;line-height:1.6}
/* ---- code ---- */
.code{background:#0e1220;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:22px;font-family:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:#b6c2d4;overflow-x:auto}
.code .c{color:#5d6878}.code .k{color:#ff7d8c}.code .f{color:#42c7e8}
/* ---- evidence note ---- */
.ev{border:1px solid rgba(36,196,173,.28);background:rgba(36,196,173,.04);border-radius:10px;padding:14px 18px;font-size:13px;color:#86c9be;margin-top:44px}
/* ---- footer ---- */
.foot{max-width:1180px;margin:0 auto;padding:56px 40px 88px;border-top:1px solid rgba(255,255,255,.05);display:flex;flex-wrap:wrap;gap:40px}
.foot .col{min-width:150px}
.foot h4{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#7b8494;margin:0 0 14px;font-weight:600}
.foot a{display:block;color:#9aa3b2;font-size:14px;margin-bottom:9px}
.foot a:hover{color:#f2f4f8}
@media(max-width:900px){.dispatch{grid-template-columns:1fr}.hero h1{font-size:44px}.sh2{font-size:34px}.nav .links a:not(.cta){display:none}.hero,.section{padding-left:22px;padding-right:22px}}
@media (prefers-reduced-motion: reduce){*{transition:none!important}}
a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #42c7e8;outline-offset:2px}
</style>
</head>
<body>
<nav class="nav">
<div class="brand">AFTERGRAPH<i>.</i></div>
<div class="links"><a href="#platform">Platform</a><a href="#research">Research</a><a href="#trust">Trust</a><a href="https://docs.aftergraph.org" target="_blank" rel="noopener">Docs \u2197</a><a href="/launch" class="cta">Launch</a></div>
</nav>

<header class="hero">
<h1>Intelligence that must answer <em>for itself</em></h1>
<p class="lede">Missions, authority, durable execution, evidence, verification. Aftergraph is infrastructure and open research for agentic institutions that can be held accountable \u2014 not systems that just seem confident.</p>
<div class="cta-row">
<a class="btn btn-p" href="/launch">Open the launcher \u2192</a>
<a class="btn btn-g" href="https://docs.aftergraph.org" target="_blank" rel="noopener">Read the docs \u2197</a>
<a class="btn btn-g" href="https://github.com/Aftergraph">Browse the repositories</a>
</div>
</header>

<div class="strips">
<span class="strip"><span class="dot">\u25CF</span> aftergraph.org operational</span>
<span class="strip"><b>20 repositories</b> \xB7 12 public \xB7 8 private</span>
<span class="strip"><b>Most mature:</b> works-execution v0.3.6</span>
<span class="strip">Research evidence is <b>never</b> runtime authority</span>
</div>

<section class="section" id="thesis">
<div class="stitle">Thesis</div>
<h2 class="sh2">From intent to verified outcome</h2>
<p class="slede">An agent acts under a mission. It spends only what an authority allows. Every action leaves an evidence trail. A verifier can check the outcome. That is the operating model Aftergraph is built on.</p>
<div class="chain">
<span class="node">Intent</span><span class="arr">\u2192</span><span class="node">Mission</span><span class="arr">\u2192</span><span class="node">Authority</span><span class="arr">\u2192</span><span class="node">Execution</span><span class="arr">\u2192</span><span class="node">Evidence</span><span class="arr">\u2192</span><span class="node">Verification</span><span class="arr">\u2192</span><span class="node dim">Verified outcome</span>
</div>
</section>

<section class="section" id="platform">
<div class="stitle">Platform</div>
<h2 class="sh2">What is built, honestly labelled</h2>
<p class="slede">Every surface carries a maturity badge. Prototype, research, production \u2014 nothing claims more than it has. WORKS is furthest along; everything else is openly prototyped.</p>

<div class="dispatch">
<div class="prim">
<h3>WORKS Execution <span class="badge b-pr">v0.3.6 \xB7 prototype</span></h3>
<p style="color:#b6c2d4;font-size:15px;line-height:1.65;margin:0 0 8px">Durable execution plane for autonomous work \u2014 missions, WorkGraph scheduling, workers, leases, budgets, recovery and execution evidence. The most mature surface in the ecosystem.</p>
<div class="go"><a class="btn btn-g" href="https://github.com/Aftergraph/works-execution">Repository \u2192</a></div>
</div>
<div class="aux">
<h3>Work Intelligence <span class="badge b-pr">prototype</span></h3>
<p style="color:#9aa3b2;font-size:14px;line-height:1.6;margin:0">Source-neutral observations become structured, attributable WorkItems.</p>
<div class="go" style="margin-top:14px"><a class="btn btn-g" href="https://github.com/Aftergraph/work-intelligence-v2">Repository \u2192</a></div>
</div>
</div>

<div class="grid">
<div class="card-p"><h3>Trust Gateway <span class="badge b-pr">prototype</span></h3><p>Fail-closed enforcement: approvals, policy, budgets, tamper-evident audit.</p><div class="go"><a href="https://github.com/Aftergraph/trust-gateway">Repository \u2192</a></div></div>
<div class="card-p"><h3>AIE <span class="badge b-pr">prototype</span></h3><p>Agentic Institution Engineering \u2014 authority, delegation, revocation, budget semantics.</p><div class="go"><a href="https://github.com/Aftergraph/aie">Repository \u2192</a></div></div>
<div class="card-p"><h3>Studio <span class="badge b-pr">prototype</span></h3><p>Operator UX: mission status, evidence, approvals, needs-you flows.</p><div class="go"><a href="https://github.com/Aftergraph/studio">Repository \u2192</a></div></div>
<div class="card-p"><h3>Governance <span class="badge b-pr">prototype</span></h3><p>Cross-repo contracts, terminology, exact-head state, evidence boundaries.</p><div class="go"><a href="https://github.com/Aftergraph/after-graph-governance">Repository \u2192</a></div></div>
</div>
</section>

<section class="section" id="research">
<div class="stitle">Research</div>
<h2 class="sh2">Claims you can reproduce</h2>
<p class="slede">Research is first-class and evidence-labelled. Research results never become runtime authority by themselves \u2014 a promotion decision is a separate, governed step.</p>
<div class="res">
<div class="r"><h4>SPEC-001 Mission Contracts</h4><div class="meta"><span class="badge b-r">Research</span>intelligence-systems-research</div><p>Mission contracts and the assurance model for verifiable agent missions.</p></div>
<div class="r"><h4>MISSION-Bench</h4><div class="meta"><span class="badge b-r">Research</span>intelligence-systems-research</div><p>Benchmark for mission-level agent performance under governed execution.</p></div>
<div class="r"><h4>Aftergraph Foundation Model</h4><div class="meta"><span class="badge b-r">Research</span>afm</div><p>Training, datasets, evals and adapters for agentic software engineering.</p></div>
<div class="r"><h4>Sentinel</h4><div class="meta"><span class="badge b-r">Research</span>sentinel</div><p>Verified code-review: PRs into merge-ready verdicts. Exact-HEAD verdicts, stale-base invalidation, cited evidence.</p></div>
<div class="r"><h4>Model Registry</h4><div class="meta"><span class="badge b-r">Research</span>model-registry</div><p>Canonical model families, versions, lifecycle state, provenance and evaluation records.</p></div>
</div>
<div class="ev">Evidence rule: visibility never upgrades evidence. Experiments, prototypes and production capabilities are labelled as such. Academic fanfiction is still fanfiction.</div>
</section>

<section class="section" id="trust">
<div class="stitle">Trust</div>
<h2 class="sh2">Why believe any of this</h2>
<p class="slede">Because you can check. The repositories are open, releases are gated, claims are labelled, and the exact state of every repo is queryable at build time.</p>
<div class="code"><span class="c"># verify exact state at build time \u2014 no runtime fetch, no stale claim</span>
<span class="k">gh</span> api repos/Aftergraph/works-execution --jq <span class="f">'.description, .license.spdx_id'</span></div>
</section>

<footer class="foot">
<div class="col"><h4>Ecosystem</h4><a href="https://docs.aftergraph.org">Knowledge Plane</a><a href="https://github.com/Aftergraph">GitHub</a><a href="/launch">Launcher</a><a href="/status">Status</a></div>
<div class="col"><h4>Research</h4><a href="https://github.com/Aftergraph/intelligence-systems-research">ISR</a><a href="https://github.com/Aftergraph/aie">AIE</a><a href="https://github.com/Aftergraph/afm">AFM</a><a href="https://github.com/Aftergraph/sentinel">Sentinel</a><a href="https://github.com/Aftergraph/model-registry">Model Registry</a></div>
<div class="col"><h4>Products</h4><a href="https://github.com/Aftergraph/works-execution">WORKS</a><a href="https://github.com/Aftergraph/trust-gateway">Trust Gateway</a><a href="https://github.com/Aftergraph/work-intelligence-v2">WI v2</a><a href="https://github.com/Aftergraph/studio">Studio</a></div>
<div class="col"><h4>Meta</h4><a href="https://github.com/Aftergraph/aftergraph.org">This site's source</a><a href="/healthz">Health</a></div>
</footer>
</body>
</html>
`;
  var LAUNCH = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Launcher \u2014 Aftergraph</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23080c14'/><path d='M16 5l9 5v12l-9 5-9-5V10z' fill='none' stroke='%2342c7e8' stroke-width='2'/></svg>">
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#080c14;color:#f5f7fa;font:15px/1.6 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:760px;margin:0 auto;padding:64px 24px}
a{color:#8ab4f8;text-decoration:none}
.brand{font-weight:700;letter-spacing:.02em;font-size:13px;color:#42c7e8;text-transform:uppercase;margin-bottom:32px}
.brand a{color:#42c7e8}
.palette{background:rgba(14,22,48,.8);border:1px solid rgba(137,147,164,.25);border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.5)}
.search input{width:100%;background:transparent;border:none;outline:none;color:#f5f7fa;font-size:22px;padding:22px 24px;font-family:inherit;border-bottom:1px solid rgba(137,147,164,.2)}
.search input::placeholder{color:#5a6474}
kbd{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;background:rgba(137,147,164,.18);border:1px solid rgba(137,147,164,.3);border-radius:4px;padding:1px 5px;color:#9fb0c8}
.hint{display:flex;gap:16px;padding:10px 24px;border-bottom:1px solid rgba(137,147,164,.12);font-size:12px;color:#5a6474;align-items:center}
.hint .spacer{flex:1}
.results{max-height:520px;overflow-y:auto}
.group{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8993a4;padding:14px 24px 6px}
.item{display:flex;align-items:center;gap:12px;padding:11px 24px;cursor:pointer;border-left:3px solid transparent}
.item:hover{background:rgba(66,199,232,.06)}
.item.active{background:rgba(66,199,232,.12);border-left-color:#42c7e8}
.item .name{font-weight:600;font-size:15px}
.item .desc{color:#8993a4;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:420px}
.item .right{margin-left:auto;flex-shrink:0}
.item .arrow{color:#42c7e8;font-size:16px;opacity:0}
.item.active .arrow{opacity:1}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.badge-prototype{background:rgba(240,166,74,.16);color:#f0a64a;border:1px solid rgba(240,166,74,.35)}
.badge-research{background:rgba(147,158,180,.15);color:#8993a4;border:1px solid rgba(147,158,180,.4)}
.badge-production{background:rgba(36,196,173,.15);color:#24c4ad;border:1px solid rgba(36,196,173,.4)}
.badge-org{background:rgba(76,139,216,.15);color:#4c8bd8;border:1px solid rgba(76,139,216,.4)}
.empty{padding:32px 24px;color:#5a6474;font-size:14px;text-align:center}
.back{margin-top:24px;text-align:center;font-size:13px;color:#5a6474}
.back a{color:#8993a4}
@media(max-width:600px){.item .desc{display:none}.wrap{padding:32px 12px}}
@media (prefers-reduced-motion: reduce){*{transition:none!important}}
</style>
<link rel="icon" type="image/svg+xml" href="/favicon.ico">
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Launcher \u2014 Aftergraph">
<meta property="og:description" content="System launcher for public Aftergraph destinations.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/launch">
<meta property="og:image" content="https://aftergraph.org/og-image.svg">
</head>
<body>
<div class="wrap">
<div class="brand"><a href="/">\u2190 AFTERGRAPH</a></div>
<div class="palette" id="palette">
<div class="search"><input id="q" type="text" placeholder="Type to search\u2026  e.g. trust, research, launch" autofocus autocomplete="off"></div>
<div class="hint"><span>\u2191\u2193 navigate</span><span>\u21B5 open</span><span>esc close</span><span class="spacer"></span><span>maturity-labelled</span></div>
<div class="results" id="results"></div>
</div>
<div class="back"><a href="/">\u2190 Back to aftergraph.org</a></div>
</div>
<script>
const ITEMS = [
{g:"Platform",n:"Trust Gateway",d:"Fail-closed control plane \u2014 approvals, policy, budgets, audit",u:"https://github.com/Aftergraph/trust-gateway",b:"prototype"},
{g:"Platform",n:"WORKS Execution",d:"Durable execution \u2014 missions, WorkGraph, leases, recovery",u:"https://github.com/Aftergraph/works-execution",b:"prototype"},
{g:"Platform",n:"Work Intelligence v2",d:"Observations \u2192 structured, attributable WorkItems",u:"https://github.com/Aftergraph/work-intelligence-v2",b:"prototype"},
{g:"Platform",n:"AIE",d:"Agentic Institution Engineering \u2014 authority & delegation semantics",u:"https://github.com/Aftergraph/aie",b:"prototype"},
{g:"Platform",n:"Studio",d:"Operator UX \u2014 mission status, evidence, approvals",u:"https://github.com/Aftergraph/studio",b:"prototype"},
{g:"Platform",n:"Governance",d:"Cross-repo contracts, terminology, evidence boundaries",u:"https://github.com/Aftergraph/after-graph-governance",b:"prototype"},
{g:"Platform",n:"Knowledge Plane (docs)",d:"Live developer & research portal - compiler over canonical sources",u:"https://docs.aftergraph.org",b:"prototype"},
{g:"Research",n:"Intelligence Systems Research",d:"SPEC-001, MISSION-Bench, assurance, replication",u:"https://github.com/Aftergraph/intelligence-systems-research",b:"research"},
{g:"Research",n:"Aftergraph Foundation Model",d:"Training, datasets, evals, adapters \u2014 agentic SE",u:"https://docs.aftergraph.org/",b:"internal"},
{g:"Research",n:"Model Registry",d:"Canonical model families, versions, lifecycle, provenance",u:"https://docs.aftergraph.org/standards/contracts/",b:"internal"},
{g:"Build",n:"Trust & Verification",d:"9 mechanical gates, evidence discipline, what the plane won't do.",u:"https://docs.aftergraph.org/company/trust/",maturity:"public",type:"docs"},
{g:"Build",n:"Context Packs (ACC-shaped)",d:"Portable context bundles per page for agents.",u:"https://docs.aftergraph.org/context/index.json",maturity:"public",type:"docs"},
{g:"Research",n:"Sentinel",d:"Verified code-review: PRs into merge-ready verdicts, exact-HEAD",u:"https://github.com/Aftergraph/sentinel",b:"research"},
{g:"Research",n:"Context Continuity",d:"Portable state-transfer capsules (Draft 0.1)",u:"https://github.com/Aftergraph/after-graph-governance/blob/main/docs/ACC-BOUNDARY-PROPOSAL-v0.1.md",b:"internal"},
{g:"Verify",n:"Sentinel",d:"Verified code-review: PRs into merge-ready verdicts, exact-HEAD.",u:"https://github.com/Aftergraph/sentinel",b:"research"},
{g:"Brand",n:"Brand OS",d:"Identity, tokens, assets, communication contracts",u:"https://github.com/Aftergraph/brand",b:"production"},
{g:"Organization",n:"GitHub Organization",d:"All Aftergraph repositories and community files",u:"https://github.com/Aftergraph",b:"org"},
{g:"Site",n:"Home",d:"aftergraph.org landing",u:"/",b:"org"},
{g:"Site",n:"Status",d:"Operational snapshot - repos, releases, platform",u:"/status",b:"org"},
{g:"Site",n:"Health check",d:"Deployment status + timestamp",u:"/healthz",b:"org"}
];
const q = document.getElementById('q');
const results = document.getElementById('results');
let filtered = [], active = 0;
function render(){
  const t = q.value.trim().toLowerCase();
  filtered = ITEMS.filter(i => !t || (i.n+" "+i.d+" "+i.g).toLowerCase().includes(t));
  active = 0;
  if(!filtered.length){results.innerHTML = '<div class="empty">No destinations match \u2014 try "research" or "studio".</div>';return;}
  let html = "", last = "";
  filtered.forEach((it,idx) => {
    if(it.g !== last){html += '<div class="group">'+it.g+'</div>';last=it.g;}
    html += '<div class="item'+(idx===0?' active':'')+'" data-i="'+idx+'">'
      + '<span class="name">'+it.n+'</span>'
      + '<span class="desc">'+it.d+'</span>'
      + '<span class="right"><span class="badge badge-'+it.b+'">'+it.b+'</span><span class="arrow">\u2192</span></span>'
      + '</div>';
  });
  results.innerHTML = html;
}
function open(i){const it=filtered[i];if(it)location.href=it.u;}
document.querySelector('#results').addEventListener('mousemove',e=>{
  const el=e.target.closest('.item');if(!el)return;
  document.querySelectorAll('.item').forEach(x=>x.classList.remove('active'));
  el.classList.add('active');active=+el.dataset.i;
});
document.querySelector('#results').addEventListener('click',e=>{
  const el=e.target.closest('.item');if(el)open(+el.dataset.i);
});
q.addEventListener('input',render);
q.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();active=Math.min(active+1,filtered.length-1);}
  else if(e.key==='ArrowUp'){e.preventDefault();active=Math.max(active-1,0);}
  else if(e.key==='Enter'){open(active);return;}
  else if(e.key==='Escape'){q.value='';render();return;}
  else return;
  document.querySelectorAll('.item').forEach((x,i)=>x.classList.toggle('active',i===active));
  document.querySelectorAll('.item')[active]?.scrollIntoView({block:'nearest'});
});
render();
<\/script>
</body>
</html>
`;
  var NOTFOUND = '<!doctype html>\n<html lang="en" data-theme="dark">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="robots" content="noindex">\n<title>404 \u2014 Aftergraph</title>\n<style>\n:root{color-scheme:dark}\n*{box-sizing:border-box}\nhtml,body{margin:0;padding:0}\nbody{background:#0a0c12;color:#f2f4f8;font-family:Inter,"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-feature-settings:"cv01","ss03";display:flex;align-items:center;justify-content:center;min-height:100vh;-webkit-font-smoothing:antialiased}\n.wrap{max-width:560px;padding:40px 24px;text-align:left}\n.code{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:64px;line-height:1;color:#42c7e8;font-weight:600;letter-spacing:-2px;margin-bottom:8px}\nh1{font-size:26px;font-weight:600;letter-spacing:-.4px;margin:0 0 12px;color:#f2f4f8}\np{color:#9aa3b2;font-size:15px;line-height:1.65;margin:0 0 28px}\na{color:#42c7e8;text-decoration:none;font-weight:500}\na:hover{color:#8fe0f5}\n.mono{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:13px;color:#5d6878;margin-bottom:28px}\n.btn{display:inline-block;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);padding:10px 20px;border-radius:6px;color:#d7dbe2;font-weight:600;font-size:15px}\n.btn:hover{border-color:rgba(66,199,232,.4);color:#42c7e8}\n</style>\n</head>\n<body>\n<div class="wrap">\n<div class="code">404</div>\n<h1>This page does not exist</h1>\n<p>The destination you asked for is not part of aftergraph.org \u2014 or it never was. The platform serves a fixed set of surfaces: the landing page, the launcher, health, robots and this error page.</p>\n<div class="mono">aftergraph.org \xB7 evidence rule: visibility never upgrades evidence</div>\n<a class="btn" href="/">\u2190 Back to aftergraph.org</a>\n</div>\n</body>\n</html>\n';
  var MONOGRAM = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="Aftergraph Monogram">\n  <path d="M128 24 218 76v104l-90 52-90-52V76z" fill="none" stroke="#42C7E8" stroke-width="10" stroke-linejoin="round"/>\n  <g stroke="#F5F7FA" stroke-width="6" fill="none" stroke-linejoin="round">\n    <path d="M78 92 128 62l50 30v72l-50 30-50-30z"/>\n    <path d="M128 62v132"/>\n  </g>\n  <g fill="#F5F7FA">\n    <circle cx="128" cy="62" r="10"/>\n    <circle cx="78" cy="92" r="10"/>\n    <circle cx="178" cy="92" r="10"/>\n    <circle cx="78" cy="164" r="10"/>\n    <circle cx="178" cy="164" r="10"/>\n    <circle cx="128" cy="194" r="10"/>\n  </g>\n  <path d="m128 101 27 27-27 27-27-27z" fill="#42C7E8"/>\n</svg>\n';
  var LLMS = "# Aftergraph\n\n> Infrastructure and open research for verifiable intelligent systems: missions, authority, durable execution, evidence, verification and agentic institutions.\n\n## Key pages\n\n- [aftergraph.org](https://aftergraph.org/): Landing page\n- [Launcher](https://aftergraph.org/launch): System launcher / command palette for all Aftergraph destinations\n- [Status](https://aftergraph.org/status): Operational snapshot (build-time)\n- [Knowledge Plane docs](https://docs.aftergraph.org/): Live developer & research portal\n- [Knowledge Plane quickstart](https://docs.aftergraph.org/developers/quickstart/): Verify the plane in 10 minutes\n- [Knowledge Plane Contract Explorer](https://docs.aftergraph.org/standards/contracts/): 13 canonical cross-repo contracts\n- [Knowledge Plane Evidence](https://docs.aftergraph.org/evidence/claim-graph/): C-001..C-008 claims with verbatim audit statuses\n- [Knowledge Plane Sentinel](https://docs.aftergraph.org/sentinel/): Verified code-review strategy docs\n- [Health](https://aftergraph.org/healthz): Deployment status\n\n## Deep index (from the Knowledge Plane)\n\n- [Platform overview](https://docs.aftergraph.org/platform/)\n- [Golden Mission route](https://docs.aftergraph.org/platform/golden-mission/)\n- [System Map (verified bindings)](https://docs.aftergraph.org/platform/system-map/)\n- [Research overview](https://docs.aftergraph.org/research/)\n- [Claim chains C-001..C-008](https://docs.aftergraph.org/evidence/claim-graph/)\n- [Docs index (llms.txt)](https://docs.aftergraph.org/llms.txt)\n\n## Context packs (ACC-shaped, machine-usable)\n\n- [Index](https://docs.aftergraph.org/context/index.json)\n- [Platform](https://docs.aftergraph.org/context/platform.json)\n- [Golden Mission](https://docs.aftergraph.org/context/platform.golden-mission.json)\n- [Developers](https://docs.aftergraph.org/context/developers.json)\n- [Research](https://docs.aftergraph.org/context/research.json)\n- [Standards](https://docs.aftergraph.org/context/standards.json)\n\n## Platform topology (from Aftergraph/after-graph-governance)\n\nInstalled platform topology: 20 repositories\nPublic repositories: 12\nPrivate repositories: 8\n\n### Public\n\n- `.github`\n- `after-graph-governance`\n- `aftergraph.org`\n- `aie`\n- `brand`\n- `docs`\n- `intelligence-systems-research`\n- `sentinel`\n- `studio`\n- `trust-gateway`\n- `work-intelligence-v2`\n- `works-execution`\n\n### Private\n\n8 private repositories participate in the topology; names are withheld on this public surface (see governance topology for the canonical inventory).\n\n\n## Organization\n\n- GitHub organization: [github.com/Aftergraph](https://github.com/Aftergraph)\n- Repositories (public): intelligence-systems-research, aie, trust-gateway, works-execution, work-intelligence-v2, after-graph-governance, studio, brand, docs, aftergraph.org, .github\n\n## Evidence rule\n\nVisibility never upgrades evidence. Research claims, experiments, prototypes and production capabilities are labelled by maturity on every surface. Research evidence is never runtime authority by itself.\n";
  var SECURITY = "Contact: https://github.com/Aftergraph/.github/security/advisories/new\nContact: mailto:Empire1266@gmail.com\nExpires: 2027-09-07T00:00:00.000Z\nPreferred-Languages: en\nCanonical: https://aftergraph.org/.well-known/security.txt\nPolicy: https://github.com/Aftergraph/.github/blob/main/SECURITY.md\n";
  var STATUS = '<!doctype html>\n<html lang="en" data-theme="dark">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Status \u2014 Aftergraph</title>\n<meta property="og:title" content="Status \u2014 Aftergraph">\n<meta property="og:type" content="website">\n<meta property="og:url" content="https://aftergraph.org/status">\n<style>\n:root{color-scheme:dark}*{box-sizing:border-box}html,body{margin:0;padding:0}body{background:#0a0c12;color:#f2f4f8;font-family:Inter,"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}a{color:#42c7e8;text-decoration:none}a:hover{color:#8fe0f5}.wrap{max-width:980px;margin:0 auto;padding:56px 32px 88px}.brand{font-weight:600;letter-spacing:.02em;font-size:15px;margin-bottom:40px}.brand i{font-style:normal;color:#42c7e8}h1{font-size:40px;line-height:1.05;letter-spacing:-.8px;font-weight:600;margin:0 0 10px}.lede{color:#9aa3b2;font-size:16px;margin:0 0 36px;max-width:700px}.card{border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.015);border-radius:12px;padding:24px;margin-bottom:18px}.card h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#42c7e8;font-weight:600;margin:0 0 16px}.ok{display:inline-block;width:8px;height:8px;border-radius:50%;background:#24c4ad;margin-right:8px;vertical-align:middle}table{width:100%;border-collapse:collapse;font-size:13.5px}th{text-align:left;color:#7b8494;font-weight:500;font-size:12px;letter-spacing:.06em;text-transform:uppercase;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.08)}td{padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.04);vertical-align:top}.rname{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;white-space:nowrap;color:#d7dbe2}.muted{color:#9aa3b2}.meta{color:#5d6878;font-size:12px;margin-top:8px}.nav a{color:#9aa3b2;font-size:13px;margin-right:16px}.nav a:hover{color:#f2f4f8}@media(max-width:760px){.wrap{padding-left:18px;padding-right:18px}table{font-size:12px}.rname{white-space:normal}}\n</style>\n</head>\n<body>\n<div class="wrap">\n<div class="brand">AFTERGRAPH<i>.</i> <span class="nav"><a href="/">Landing</a><a href="/launch">Launcher</a><a href="/healthz">Health</a></span></div>\n<h1>Status</h1>\n<p class="lede">Public platform snapshot. Repository topology is governed in <a href="https://github.com/Aftergraph/after-graph-governance">Aftergraph/after-graph-governance</a>; exact Git heads come from its generated org-state surface. This page is a public projection, not canonical repository truth.</p>\n<div class="card">\n<h2><span class="ok"></span>Platform &amp; site</h2>\n<table>\n<tr><th>Surface</th><th>Status</th><th>Boundary</th></tr>\n<tr><td class="rname">aftergraph.org</td><td>Operational</td><td class="muted">Public presentation and launcher only</td></tr>\n<tr><td class="rname">docs.aftergraph.org</td><td>Live</td><td class="muted">Provenance-pinned Knowledge Plane</td></tr>\n</table>\n</div>\n<div class="card">\n<h2>Platform topology <span class="meta">20 installed \xB7 12 public \xB7 8 private</span></h2>\n<table>\n<tr><th>Public repository</th><th>Canonical role</th></tr>\n<tr><td class="rname">.github</td><td>Organization/community infrastructure</td></tr>\n<tr><td class="rname">after-graph-governance</td><td>Canonical topology, contracts and exact-head generation</td></tr>\n<tr><td class="rname">aftergraph.org</td><td>Public front door and launcher</td></tr>\n<tr><td class="rname">aie</td><td>Normative institution / authority semantics</td></tr>\n<tr><td class="rname">brand</td><td>Brand OS and design system</td></tr>\n<tr><td class="rname">docs</td><td>Knowledge Plane</td></tr>\n<tr><td class="rname">intelligence-systems-research</td><td>Research, SPEC-001, MISSION-Bench and assurance evidence</td></tr>\n<tr><td class="rname">studio</td><td>General-purpose human operating environment</td></tr>\n<tr><td class="rname">trust-gateway</td><td>Runtime admission and enforcement</td></tr>\n<tr><td class="rname">work-intelligence-v2</td><td>Observation \u2192 WorkItem inference</td></tr>\n<tr><td class="rname">works-execution</td><td>Durable execution and execution evidence</td></tr>\n<tr><td class="rname">sentinel</td><td>Verified code-review verdicts</td></tr>\n</table>\n<p class="meta">Eight private repositories participate in the topology but their source content is not rendered on this public surface.</p>\n</div>\n<div class="card">\n<h2>Evidence boundaries</h2>\n<p class="muted" style="font-size:14px;margin:0 0 10px">Visibility never upgrades evidence. Runtime evidence, AIE conformance, scientific evidence and production authority are separate states. Exact-head state also does not prove functional conformance.</p>\n<p class="meta">Evidence cut: 2026-09-07 \xB7 topology count reconciled against the installed Aftergraph GitHub organization</p>\n</div>\n</div>\n</body>\n</html>\n';
  var HEALTH = '{"status":"ok","deployed":"build-time","route":"aftergraph-site v1.2.0","sha":"local"}';
  var ROBOTS = "User-agent: *\nAllow: /\nDisallow: /healthz\n\n# Aftergraph allows responsible AI training crawlers that honor robots.txt.\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: https://aftergraph.org/sitemap.xml\n";
  var SITEMAP = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://aftergraph.org/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n  <url><loc>https://aftergraph.org/launch</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n  <url><loc>https://aftergraph.org/status</loc><changefreq>daily</changefreq><priority>0.7</priority></url>\n</urlset>\n';
  addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    const p = url.pathname;
    let body;
    let contentType = "text/html;charset=utf-8";
    let cache = "public, max-age=300";
    let responseStatus = 200;
    if (p === "/healthz" || p === "/health") {
      body = HEALTH;
      contentType = "application/json";
      cache = "public, max-age=60";
    } else if (p === "/robots.txt") {
      body = ROBOTS;
      contentType = "text/plain;charset=utf-8";
      cache = "public, max-age=3600";
    } else if (p === "/sitemap.xml") {
      body = SITEMAP;
      contentType = "application/xml;charset=utf-8";
      cache = "public, max-age=3600";
    } else if (p === "/llms.txt") {
      body = LLMS;
      contentType = "text/plain;charset=utf-8";
      cache = "public, max-age=3600";
    } else if (p === "/.well-known/security.txt") {
      body = SECURITY;
      contentType = "text/plain;charset=utf-8";
      cache = "public, max-age=3600";
    } else if (p === "/favicon.ico" || p === "/og-image.svg") {
      body = MONOGRAM;
      contentType = "image/svg+xml;charset=utf-8";
      cache = "public, max-age=86400";
    } else if (p === "/launch" || p === "/launch/") {
      body = LAUNCH;
    } else if (p === "/status" || p === "/status/") {
      body = STATUS;
    } else if (p === "/404") {
      body = NOTFOUND;
    } else if (p === "/") {
      body = LANDING;
    } else {
      body = NOTFOUND;
      responseStatus = 404;
      cache = "no-store";
    }
    event.respondWith(new Response(body, {
      status: responseStatus,
      headers: { "content-type": contentType, "cache-control": cache, ...SECURE }
    }));
  });
})();
//# sourceMappingURL=worker.js.map
