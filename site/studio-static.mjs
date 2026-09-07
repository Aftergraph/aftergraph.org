// Studio Tier-0 static entry: strip /studio prefix, serve Static Assets,
// SPA fallback to shell. Keeps studio-dist layout untouched.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path === '/studio' || path === '/studio/') path = '/';
    else if (path.startsWith('/studio/')) path = path.slice('/studio'.length) || '/';
    const assetReq = new Request(new URL(path + url.search, url.origin), request);
    let res = await env.ASSETS.fetch(assetReq);
    // API paths must never SPA-fallback: a 200 shell would parse as valid
    // state in the client. Real backends (Tier-1/2 proxy) own /api/* instead.
    const isApi = path === '/healthz' || path.startsWith('/api/');
    if (res.status === 404 && !isApi && !path.includes('.')) {
      res = await env.ASSETS.fetch(new Request(new URL('/' + url.search, url.origin), request));
    }
    return res;
  },
};
