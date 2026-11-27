# portfolio

Static portfolio site: plain HTML, CSS and JavaScript, no build step.

- `index.html`, `about.html`, `projects.html`, `contact.html`: public pages
- `admin.html`: sign in, then add projects, upload images and edit texts
- `assets/`: logo, flower, tool icons and poster images
- `js/store.js`: where content is saved (currently the visitor's own browser)

## Preview on Windows

Double-click `start-site.bat`, or run `serve.ps1` in PowerShell, then open http://localhost:4173

## Deploy

Vercel serves the files listed in `vercel.json` as they are. Pushing to `main` redeploys.
