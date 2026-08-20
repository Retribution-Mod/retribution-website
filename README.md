# Retribution Website

Official static site for Retribution.

- **Home:** `index.html`
- **Downloads:** `downloads.html`
- **Docs:** `docs/index.html`
- **Styles:** `css/style.css`
- **Scripts:** `js/main.js`

## Development

Open any HTML file in a browser, or run a local server:

```sh
python -m http.server 8080
```

## Deployment

This repository is automatically deployed to GitHub Pages via the workflow in `.github/workflows/pages.yml`. The default URL is:

```
https://retribution-mod.github.io/retribution-website
```

To use a custom domain, add a `CNAME` file containing the domain and configure DNS.
