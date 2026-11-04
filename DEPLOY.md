# Publishing

The app is live on GitHub Pages:

**https://jamesdefrange.github.io/pilates-class-builder/**

Repository: https://github.com/jamesdefrange/pilates-class-builder (public, because free GitHub Pages needs a public repo).

## How updates go live

Every push to the `main` branch republishes the site in about a minute.

1. Make the change (for example edit a file in /data).
2. If you changed /data, rebuild the bundle:

```bash
node scripts/build-data.js
```

3. Run the checks:

```bash
npm test
```

4. If you changed CSS or JavaScript, bump the version so phones load the new files:

```bash
scripts/bump-version.sh
```

5. Commit and push:

```bash
git add -A && git commit -m "Describe the change" && git push
```

6. Check the build finished (shows "built"):

```bash
gh api repos/jamesdefrange/pilates-class-builder/pages/builds/latest --jq .status
```

## If you ever need to set it up again from scratch

1. GitHub > New repository > name it `pilates-class-builder` > **Public** > **Create repository**.
2. In Terminal in this folder:

```bash
git remote add origin https://github.com/jamesdefrange/pilates-class-builder.git && git push -u origin main
```

3. GitHub > the repository > **Settings** > **Pages** > Source: **Deploy from a branch** > Branch: **main**, folder **/ (root)** > **Save**.
4. Wait a minute, then open the link shown at the top of that Pages screen.
