(() => {
    const resultsEl = document.getElementById('results');
    const searchEl = document.getElementById('search');
    const paginationEl = document.getElementById('pagination');
    const type = resultsEl?.dataset.type || 'plugin';
    const source = resultsEl?.dataset.source;

    if (!source || !resultsEl) return;

    let allItems = [];
    let filteredItems = [];
    let page = 1;
    const perPage = type === 'font' ? 80 : Infinity;

    function specUrl(family) {
        return `https://bunny-google-fonts.vercel.app/api/spec?font=${encodeURIComponent(family)}`;
    }

    function deepLink(type, url) {
        try {
            const u = new URL(url);
            if (type === 'font') {
                return `font://${u.host}${u.pathname}${u.search}`;
            }
            if (type === 'theme' && u.pathname.endsWith('.json')) {
                return `theme://${u.host}${u.pathname.slice(0, -5)}`;
            }
            // plugin
            return `plugin://${u.host}${u.pathname.replace(/\/$/, '')}`;
        } catch {
            return url;
        }
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    function itemUrl(item) {
        if (type === 'font') return specUrl(item.family);
        return item.installUrl;
    }

    function itemTitle(item) {
        if (type === 'font') return item.family;
        return item.name;
    }

    function itemSubtitle(item) {
        if (type === 'font') return item.category;
        return item.authors?.join(', ') || '';
    }

    function itemDescription(item) {
        if (type === 'font') return (item.subsets?.slice(0, 8).join(', ') || '') + (item.subsets?.length > 8 ? '...' : '');
        return item.description || '';
    }

    function badgeClass(status) {
        if (!status) return '';
        if (status === 'working') return 'success';
        if (status === 'broken') return 'danger';
        return 'warning';
    }

    function renderPluginThemeCard(item) {
        const url = itemUrl(item);
        const link = deepLink(type, url);
        const firstImage = type === 'theme' && item.images?.length ? `<img src="${escapeHtml(item.images[0])}" alt="" class="card-preview" loading="lazy" onerror="this.style.display='none'">` : '';
        const tags = (item.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
        const status = item.status ? `<span class="tag ${badgeClass(item.status)}">${escapeHtml(item.status)}</span>` : '';
        const warning = item.warningMessage ? `<p class="card-warning">${escapeHtml(item.warningMessage)}</p>` : '';

        return `
            <article class="download-card browse-card" data-name="${escapeHtml(itemTitle(item).toLowerCase())}">
                ${firstImage}
                <div class="card-tags">${status}${tags}</div>
                <h3>${escapeHtml(itemTitle(item))}</h3>
                <p class="card-subtitle">${escapeHtml(itemSubtitle(item))}</p>
                <p class="card-description">${escapeHtml(itemDescription(item))}</p>
                ${warning}
                <div class="download-meta">
                    <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener" class="meta-link">Source</a>
                </div>
                <div class="card-actions">
                    <button class="btn btn-sm btn-secondary copy-link" data-link="${escapeHtml(link)}">Copy deep link</button>
                    <a class="btn btn-sm btn-primary" href="${escapeHtml(link)}">Open in Retribution</a>
                </div>
            </article>
        `;
    }

    function renderFontCard(item) {
        const url = itemUrl(item);
        const link = deepLink(type, url);
        return `
            <article class="download-card browse-card font-card" data-name="${escapeHtml(item.family.toLowerCase())}" title="Preview font: ${escapeHtml(item.family)}">
                <h3 style="font-family: inherit;">${escapeHtml(item.family)}</h3>
                <p class="card-subtitle">${escapeHtml(item.category)}</p>
                <p class="card-description">${escapeHtml(itemDescription(item))}</p>
                <div class="card-actions">
                    <button class="btn btn-sm btn-secondary copy-link" data-link="${escapeHtml(link)}">Copy deep link</button>
                    <a class="btn btn-sm btn-primary" href="${escapeHtml(link)}">Open in Retribution</a>
                </div>
            </article>
        `;
    }

    function renderCard(item) {
        return type === 'font' ? renderFontCard(item) : renderPluginThemeCard(item);
    }

    function render() {
        const start = (page - 1) * perPage;
        const pageItems = perPage === Infinity ? filteredItems : filteredItems.slice(start, start + perPage);

        if (pageItems.length === 0) {
            resultsEl.innerHTML = `<p class="text-muted text-center" style="grid-column: 1/-1;">No ${type}s found.</p>`;
        } else {
            resultsEl.innerHTML = pageItems.map(renderCard).join('');
        }

        if (perPage !== Infinity) {
            const total = Math.ceil(filteredItems.length / perPage);
            let html = '';
            if (page > 1) html += `<button class="btn btn-sm btn-secondary" data-page="${page - 1}">Previous</button>`;
            html += `<span class="text-muted" style="padding: 0.5rem 1rem;">Page ${page} of ${total} (${filteredItems.length} items)</span>`;
            if (page < total) html += `<button class="btn btn-sm btn-secondary" data-page="${page + 1}">Next</button>`;
            paginationEl.innerHTML = html;
            paginationEl.style.display = 'block';
        }

        document.querySelectorAll('.copy-link').forEach(btn => {
            btn.addEventListener('click', () => {
                const link = btn.dataset.link;
                navigator.clipboard.writeText(link).then(() => {
                    const original = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => btn.textContent = original, 1200);
                }).catch(() => {
                    prompt('Copy this deep link:', link);
                });
            });
        });

        if (perPage !== Infinity) {
            paginationEl.querySelectorAll('button[data-page]').forEach(btn => {
                btn.addEventListener('click', () => {
                    page = parseInt(btn.dataset.page, 10);
                    render();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            });
        }
    }

    function filter() {
        const q = searchEl.value.trim().toLowerCase();
        filteredItems = allItems.filter(item => {
            if (!q) return true;
            if (type === 'font') {
                return item.family.toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
            }
            return (item.name || '').toLowerCase().includes(q)
                || (item.description || '').toLowerCase().includes(q)
                || (item.authors || []).some(a => a.toLowerCase().includes(q))
                || (item.tags || []).some(t => t.toLowerCase().includes(q));
        });
        page = 1;
        render();
    }

    fetch(source)
        .then(r => r.json())
        .then(data => {
            allItems = data || [];
            filteredItems = allItems.slice();
            render();
        })
        .catch(err => {
            resultsEl.innerHTML = `<p class="text-muted text-center" style="grid-column: 1/-1;">Failed to load ${type} catalog: ${escapeHtml(err.message)}</p>`;
        });

    if (searchEl) {
        searchEl.addEventListener('input', filter);
    }
})();
