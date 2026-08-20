(() => {
    const typeEl = document.getElementById('type');
    const urlEl = document.getElementById('url');
    const generateBtn = document.getElementById('generate');
    const resultEl = document.getElementById('result');
    const copyBtn = document.getElementById('copy');
    const openEl = document.getElementById('open');
    const qrEl = document.getElementById('qr');
    const qrImg = document.getElementById('qr-img');

    const placeholders = {
        plugin: 'https://example.com/plugin.js',
        theme: 'https://example.com/theme.json',
        font: 'https://bunny-google-fonts.vercel.app/api/spec?font=Roboto'
    };

    function updatePlaceholder() {
        urlEl.placeholder = placeholders[typeEl.value];
    }

    function generate() {
        const type = typeEl.value;
        const url = urlEl.value.trim();
        if (!url) return;
        const deep = `retribution://${type}?url=${encodeURIComponent(url)}`;
        resultEl.value = deep;

        openEl.href = deep;
        openEl.style.display = 'inline-flex';

        qrEl.style.display = 'block';
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(deep)}`;
    }

    typeEl.addEventListener('change', updatePlaceholder);
    generateBtn.addEventListener('click', generate);

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(resultEl.value).then(() => {
            const original = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => copyBtn.textContent = original, 1200);
        }).catch(() => {
            prompt('Copy this deep link:', resultEl.value);
        });
    });

    updatePlaceholder();
})();
