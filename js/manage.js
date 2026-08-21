(() => {
    const REPO = 'Retribution-Mod/retribution-website';
    const CONFIG = {
        plugins: { file: 'data/plugins-data.json', fields: [
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'authors', label: 'Authors (comma separated)', type: 'comma' },
            { key: 'status', label: 'Status', type: 'select', options: ['working', 'broken', 'incompatible'] },
            { key: 'sourceUrl', label: 'Source URL', type: 'text' },
            { key: 'installUrl', label: 'Install URL', type: 'text' },
            { key: 'warningMessage', label: 'Warning message', type: 'textarea' },
            { key: 'hidden', label: 'Hidden', type: 'checkbox' }
        ]},
        themes: { file: 'data/themes-data.json', fields: [
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'authors', label: 'Authors (comma separated)', type: 'comma' },
            { key: 'sourceUrl', label: 'Source URL', type: 'text' },
            { key: 'installUrl', label: 'Install URL', type: 'text' },
            { key: 'images', label: 'Images (comma separated)', type: 'comma' },
            { key: 'tags', label: 'Tags (comma separated)', type: 'comma' },
            { key: 'hidden', label: 'Hidden', type: 'checkbox' }
        ]},
        fonts: { file: 'data/fonts-data.json', fields: [
            { key: 'family', label: 'Family', type: 'text' },
            { key: 'category', label: 'Category', type: 'text' },
            { key: 'subsets', label: 'Subsets (comma separated)', type: 'comma' },
            { key: 'variants', label: 'Variants (comma separated)', type: 'comma' },
            { key: 'hidden', label: 'Hidden', type: 'checkbox' }
        ]}
    };

    let catalog = { plugins: [], themes: [], fonts: [] };
    let shas = {};
    let active = 'plugins';

    const $ = id => document.getElementById(id);
    const log = msg => {
        const el = $('log');
        el.hidden = false;
        el.textContent += (el.textContent ? '\n' : '') + msg;
        el.scrollTop = el.scrollHeight;
    };
    const clearLog = () => { $('log').textContent = ''; $('log').hidden = true; };

    function headers() {
        const token = $('token').value.trim();
        if (!token) throw new Error('Enter a GitHub token first.');
        return {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json'
        };
    }

    async function ghGet(path) {
        const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${$('branch').value}`, { headers: headers() });
        if (!res.ok) throw new Error(`GitHub GET ${path}: ${res.status} ${res.statusText}`);
        return res.json();
    }

    async function ghPut(path, content, sha, message) {
        const body = {
            message,
            content: toBase64(content),
            sha,
            branch: $('branch').value
        };
        const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`GitHub PUT ${path}: ${res.status} ${data?.message || res.statusText}`);
        return data;
    }

    function toBase64(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }

    async function loadCatalog() {
        clearLog();
        try {
            for (const [type, { file }] of Object.entries(CONFIG)) {
                const meta = await ghGet(file);
                shas[type] = meta.sha;
                const content = atob(meta.content.replace(/\n/g, ''));
                catalog[type] = JSON.parse(content) || [];
                log(`Loaded ${type}: ${catalog[type].length} items`);
            }
            render();
        } catch (e) {
            log(`Error: ${e.message}`);
        }
    }

    function render() {
        const cfg = CONFIG[active];
        const container = $('editor');
        container.innerHTML = '';

        const list = catalog[active];
        if (list.length === 0) {
            container.innerHTML = '<p class="text-muted">No items yet. Click Add item.</p>';
            return;
        }

        list.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'admin-card' + (item.hidden ? ' hidden-item' : '');
            card.dataset.index = idx;

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.innerHTML = `<h3>${escapeHtml(itemTitle(item))}</h3>`;

            const statusBadges = [];
            if (active === 'plugins' && item.status) statusBadges.push(`<span class="badge badge-${item.status === 'working' ? 'success' : (item.status === 'broken' ? 'danger' : 'warning')}">${item.status}</span>`);
            if (item.hidden) statusBadges.push('<span class="badge badge-warning">hidden</span>');
            if (statusBadges.length) header.insertAdjacentHTML('beforeend', `<div>${statusBadges.join('')}</div>`);

            card.appendChild(header);

            const fields = document.createElement('div');
            fields.className = 'admin-fields';
            cfg.fields.forEach(field => {
                const wrapper = document.createElement('div');
                if (field.type === 'checkbox') {
                    wrapper.innerHTML = `
                        <label style="display:flex;gap:0.5rem;align-items:center;cursor:pointer;">
                            <input type="checkbox" data-key="${field.key}" ${item[field.key] ? 'checked' : ''}>
                            <span>${field.label}</span>
                        </label>
                    `;
                } else if (field.type === 'select') {
                    wrapper.innerHTML = `<label>${field.label}</label>
                        <select data-key="${field.key}">
                            ${field.options.map(o => `<option value="${o}" ${item[field.key] === o ? 'selected' : ''}>${o}</option>`).join('')}
                        </select>`;
                } else if (field.type === 'textarea') {
                    wrapper.innerHTML = `<label>${field.label}</label><textarea data-key="${field.key}">${escapeHtml(item[field.key] || '')}</textarea>`;
                } else {
                    const val = field.type === 'comma' ? (item[field.key] || []).join(', ') : (item[field.key] || '');
                    wrapper.innerHTML = `<label>${field.label}</label><input type="text" data-key="${field.key}" value="${escapeHtml(val)}">`;
                }
                fields.appendChild(wrapper);
            });

            card.appendChild(fields);

            const actions = document.createElement('div');
            actions.className = 'admin-actions';
            actions.innerHTML = `
                <button class="btn btn-sm btn-danger delete-item">Delete</button>
                <button class="btn btn-sm btn-secondary duplicate-item">Duplicate</button>
            `;
            card.appendChild(actions);

            card.querySelectorAll('input, select, textarea').forEach(el => {
                el.addEventListener('input', () => updateItem(idx));
                el.addEventListener('change', () => updateItem(idx));
            });
            card.querySelector('.delete-item').addEventListener('click', () => { catalog[active].splice(idx, 1); render(); });
            card.querySelector('.duplicate-item').addEventListener('click', () => { catalog[active].splice(idx + 1, 0, JSON.parse(JSON.stringify(catalog[active][idx]))); render(); });

            container.appendChild(card);
        });
    }

    function updateItem(idx) {
        const card = $(`editor`).querySelector(`[data-index="${idx}"]`);
        if (!card) return;
        const cfg = CONFIG[active];
        const item = catalog[active][idx];
        cfg.fields.forEach(field => {
            const el = card.querySelector(`[data-key="${field.key}"]`);
            if (!el) return;
            if (field.type === 'checkbox') {
                item[field.key] = el.checked;
            } else if (field.type === 'comma') {
                item[field.key] = el.value.split(',').map(s => s.trim()).filter(Boolean);
            } else if (field.type === 'select') {
                item[field.key] = el.value;
            } else {
                item[field.key] = el.value.trim();
            }
        });
        if (item.hidden) card.classList.add('hidden-item');
        else card.classList.remove('hidden-item');
    }

    function itemTitle(item) {
        if (active === 'fonts') return item.family || 'New font';
        return item.name || 'New item';
    }

    function addItem() {
        const template = active === 'fonts' ? { family: '', category: '', subsets: [], variants: [], hidden: false }
            : active === 'themes' ? { name: '', description: '', authors: [], sourceUrl: '', installUrl: '', images: [], tags: [], hidden: false }
            : { name: '', description: '', authors: [], status: 'working', sourceUrl: '', installUrl: '', warningMessage: '', hidden: false };
        catalog[active].unshift(template);
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    async function commitAll() {
        clearLog();
        try {
            for (const [type, { file }] of Object.entries(CONFIG)) {
                const content = JSON.stringify(catalog[type], null, 2) + '\n';
                if (!shas[type]) throw new Error(`No SHA for ${type}. Load catalog first.`);
                await ghPut(file, content, shas[type], `chore: update ${type} catalog from web manager`);
                log(`Committed ${type} to ${file}`);
                const meta = await ghGet(file);
                shas[type] = meta.sha;
            }
            log('All changes saved to GitHub.');
        } catch (e) {
            log(`Error: ${e.message}`);
        }
    }

    function downloadJson() {
        for (const [type, { file }] of Object.entries(CONFIG)) {
            const blob = new Blob([JSON.stringify(catalog[type], null, 2) + '\n'], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.split('/').pop();
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    $('tabs').addEventListener('click', e => {
        if (e.target.tagName !== 'BUTTON') return;
        active = e.target.dataset.type;
        $('tabs').querySelectorAll('button').forEach(b => b.classList.toggle('active', b === e.target));
        render();
    });

    $('load').addEventListener('click', loadCatalog);
    $('add-item').addEventListener('click', addItem);
    $('save-all').addEventListener('click', commitAll);
    $('download-json').addEventListener('click', downloadJson);
})();
