const UPSTREAM = 'https://raw.githubusercontent.com/Retribution-Mod/retribution-website/main';
const GITHUB_API = 'https://api.github.com';
const BASE_BUNDLE_URL = 'https://github.com/Retribution-Mod/retribution-bundle/releases';
const BASE_NEXT_URL = 'https://github.com/Retribution-Mod/retribution-bundle-next/releases';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

function html(body, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function proxyUpstream(request, ctx, path) {
  const cache = await caches.open('site-v2');
  const cacheKey = new Request(request.url, request);
  let response = await cache.match(cacheKey);
  if (response) return response;

  const target = `${UPSTREAM}${path}`;
  const upstream = await fetch(target, { method: request.method, headers: request.headers });

  const headers = new Headers(upstream.headers);
  headers.delete('set-cookie');

  const contentType = headers.get('content-type') || '';
  if (path.endsWith('.css')) headers.set('Content-Type', 'text/css; charset=utf-8');
  else if (path.endsWith('.js')) headers.set('Content-Type', 'application/javascript; charset=utf-8');
  else if (path.endsWith('.json')) headers.set('Content-Type', 'application/json; charset=utf-8');
  else if (path.endsWith('.png')) headers.set('Content-Type', 'image/png');

  response = new Response(upstream.body, { status: upstream.status, headers });
  if (upstream.ok && !path.endsWith('.html')) {
    response.headers.set('Cache-Control', 'public, max-age=300');
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
}

async function githubRelease(repo, fallbackAsset) {
  const res = await fetch(`${GITHUB_API}/repos/Retribution-Mod/${repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Retribution-Website' }
  });
  if (!res.ok) return json({ error: 'GitHub API failed' }, res.status);
  const data = await res.json();
  if (fallbackAsset) {
    const asset = data.assets.find(a => a.name === fallbackAsset) || data.assets[0];
    return json({
      tag: data.tag_name,
      published: data.published_at,
      asset: asset ? { name: asset.name, size: asset.size, url: asset.browser_download_url } : null
    });
  }
  return json({
    tag: data.tag_name,
    published: data.published_at,
    body: data.body,
    assets: data.assets.map(a => ({ name: a.name, size: a.size, url: a.browser_download_url }))
  });
}

function toDeepLink(type, target) {
  try {
    const u = new URL(target);
    if (type === 'font') {
      return `font://${u.host}${u.pathname}${u.search}`;
    }
    if (type === 'theme' && u.pathname.endsWith('.json')) {
      return `theme://${u.host}${u.pathname.slice(0, -5)}`;
    }
    if (type === 'bundle') {
      return target; // bundle deep links use retribution:// or manager:// elsewhere
    }
    return `plugin://${u.host}${u.pathname.replace(/\/$/, '')}`;
  } catch {
    return target;
  }
}

async function deepLinkPage(url) {
  const type = url.searchParams.get('type') || 'plugin';
  const target = url.searchParams.get('url') || '';
  const deep = toDeepLink(type, target);
  return html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Open in Retribution</title>
  <style>
    body { background: #0b0c0f; color: #f8f9fc; font-family: Inter, system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; text-align: center; }
    a { color: #a78bfa; }
    .btn { display: inline-flex; align-items: center; gap: .5rem; padding: .75rem 1.25rem; border-radius: 8px; background: #8b5cf6; color: #fff; font-weight: 600; text-decoration: none; margin: .5rem; }
    code { background: #1a1c25; padding: .2rem .5rem; border-radius: 6px; font-size: .85em; }
  </style>
</head>
<body>
  <h1>Open in Retribution</h1>
  <p>Tap the button below on a device with Retribution installed.</p>
  <a class="btn" href="${deep}">Install ${type}</a>
  <p style="max-width: 600px; word-break: break-all;"><code>${deep}</code></p>
  <p class="text-muted">If nothing happens, make sure Retribution is installed and Discord is running.</p>
</body>
</html>`);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

    if (path === '/' || path === '/index.html') {
      return proxyUpstream(request, ctx, '/index.html');
    }

    if (path.startsWith('/api/')) {
      const rest = path.slice('/api/'.length);
      if (rest.startsWith('releases/')) {
        const repo = rest.slice('releases/'.length);
        if (!repo || repo.includes('/') || repo.includes('..')) return json({ error: 'Invalid repo' }, 400);
        return githubRelease(repo);
      }
      if (rest === 'discord-versions') {
        return json({
          note: 'Curated list. Manager may still prefer the live tracker.',
          versions: [
            { code: '241013', name: '241.13 (stable, old)', bundle: 'old' },
            { code: '241020', name: '241.20 (stable, old)', bundle: 'old' },
            { code: '341000', name: '341.0 (stable, new)', bundle: 'new' },
            { code: '341001', name: '341.1 (stable, new)', bundle: 'new' }
          ]
        });
      }
      if (rest === 'bundle-urls') {
        return json({
          old: `${BASE_BUNDLE_URL}/latest/download/retribution-old.min.js`,
          new_release: `${BASE_BUNDLE_URL}/latest/download/retribution-new.min.js`,
          next: `${BASE_NEXT_URL}/latest/download/retribution.min.js`
        });
      }
      return json({ error: 'Unknown API' }, 404);
    }

    if (path === '/d') return deepLinkPage(url);

    if (path === '/.well-known/apple-app-site-association') {
      return json({
        applinks: {
          apps: [],
          details: [{
            appID: '53Q6R32WPB.com.hammerandchisel.discord',
            paths: ['/d', '/browse/*', '/plugins*', '/themes*', '/fonts*']
          }]
        }
      });
    }

    return proxyUpstream(request, ctx, path);
  }
};
