(() => {
    const base = new URL('.', document.baseURI).pathname;

    // Mobile nav toggle
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.main-nav');

    if (menuBtn && nav) {
        menuBtn.addEventListener('click', () => {
            const open = nav.classList.toggle('open');
            menuBtn.setAttribute('aria-expanded', String(open));
        });
    }

    // Active nav link
    document.querySelectorAll('.main-nav a, .docs-sidebar a').forEach(link => {
        const href = new URL(link.href, location.href).pathname;
        if (href === location.pathname || (href !== base && href !== base + '/' && location.pathname.startsWith(href))) {
            link.classList.add('active');
        }
    });

    // Fetch latest release metadata for download cards
    const releases = [
        { repo: 'retribution-bundle', asset: 'retribution-old.min.js', fallback: 'retribution.min.js', id: 'bundle-old' },
        { repo: 'retribution-bundle', asset: 'retribution-new.min.js', fallback: 'retribution.min.js', id: 'bundle-new' },
        { repo: 'retribution-bundle-next', asset: 'retribution.min.js', id: 'bundle-next' },
        { repo: 'retribution-xposed', asset: 'app-release.apk', id: 'xposed' },
        { repo: 'retribution-manager', asset: 'retribution-manager-1.3.0.apk', id: 'manager' },
        { repo: 'retribution-tweak', asset: 'Retribution.ipa', id: 'tweak-ipa' },
        { repo: 'retribution-tweak', asset: 'io.github.retribution-mod.app_2.0.4_iphoneos-arm64.deb', fallback: 'io.github.retribution-mod.app_2.0.4_iphoneos-arm.deb', id: 'tweak-deb' },
    ];

    function fmtBytes(bytes) {
        if (!bytes || bytes <= 0) return '';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
    }

    const useWorker = location.host.includes('workers.dev') || location.host.includes('retribution-website');

    async function refreshMeta() {
        for (const rel of releases) {
            try {
                let data, assets;
                if (useWorker) {
                    const res = await fetch(`/api/releases/${rel.repo}`);
                    if (!res.ok) continue;
                    const payload = await res.json();
                    data = { tag_name: payload.tag, published_at: payload.published, assets: payload.assets || [] };
                    assets = data.assets;
                } else {
                    const res = await fetch(`https://api.github.com/repos/Retribution-Mod/${rel.repo}/releases/latest`, {
                        headers: { Accept: 'application/vnd.github+json' }
                    });
                    if (!res.ok) continue;
                    data = await res.json();
                    assets = data.assets;
                }

                const versionEl = document.getElementById(`${rel.id}-version`);
                const sizeEl = document.getElementById(`${rel.id}-size`);
                const dateEl = document.getElementById(`${rel.id}-date`);

                if (versionEl) versionEl.textContent = data.tag_name;
                if (dateEl) dateEl.textContent = new Date(data.published_at).toLocaleDateString();

                let asset = assets.find(a => a.name === rel.asset);
                if (!asset && rel.fallback) asset = assets.find(a => a.name === rel.fallback);
                if (asset && sizeEl) sizeEl.textContent = fmtBytes(asset.size);
                if (asset) {
                    const btn = document.getElementById(`${rel.id}-btn`);
                    if (btn) btn.href = `https://github.com/Retribution-Mod/${rel.repo}/releases/download/${data.tag_name}/${asset.name}`;
                }
            } catch {
                // Fail silently; static fallback remains visible.
            }
        }
    }

    if (document.querySelector('[data-release]')) {
        refreshMeta();
    }
})();
