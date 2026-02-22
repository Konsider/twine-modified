# TwineJS Modified (Unofficial)

This repository is an **unofficial modified fork** of **TwineJS** (Twine 2), originally by Chris Klimas and contributors.

It exists because the official Twine app is missing (in my view) a number of quality-of-life features. This fork collects those improvements in one place so other people can use them, learn from them, or cherry-pick ideas.

**Project status:** This is a one-off public release of my personal improvements. I’m not actively maintaining it long-term. Feel free to fork it and continue development if you want.

**Not affiliated with or endorsed by the official Twine project.**  
Official site: https://twinery.org  
Official source: https://github.com/klembot/twinejs

---

## Screenshot

![TwineJS Modified screenshot](docs/screen.png)

---

## Download

- **Windows build:** use the **Releases** page for the latest downloadable EXE/ZIP.
- **Source code:** this repository contains the full source.

---

## What’s different in this fork

1. **Ctrl + mousewheel zoom** on the story map screen  
2. **Spell check** in the passage text editor  
3. **Word count per passage** shown in each passage editing panel  
4. **Default save directory** for saving `.twee` files  
5. Option to make **SugarCube the default story format** instead of Harlowe  
6. **Right-click menu** on passages (copy, paste, make link)  
7. **Tags shown** in the passage editor bottom bar  
8. **Sort stories by date**  
9. App starts **max window size**  
10. Default first passage name is **“Start”**  
11. **Double-click** on empty work area to create a new passage  
12. **Drag & drop passages** to create links  
13. **Right-click passage to unlink**  
14. **Attach image to passages** (editor-only; no export)  
15. **Confirmed ending** toggle per passage + shading + counts in summary  
16. **Minimap**, toolbar info, and **zoom to fit**  
17. **Bulk story import/export** + improved view/zoom toolbar options  
18. Various **bug fixes**, UI improvements, and efficiency improvements

---

## About TwineJS

TwineJS is a port of Twine to a browser and Electron app.

The story formats in minified format under `story-formats/` exist in separate repositories:

- Harlowe: https://foss.heptapod.net/games/harlowe/
- Paperthin: https://github.com/klembot/paperthin
- Snowman: https://github.com/klembot/snowman
- SugarCube: https://github.com/tmedwards/sugarcube-2

---

## Install

Run this at the top level of the directory:

```bash
npm install
```

Working with the documentation requires installing **mdbook**:
https://rust-lang.github.io/mdBook/

---

## Building / Running

### Development (browser)
```bash
npm start
```

### Development (Electron app)
```bash
npm run start:electron
```

**Warning:** Running the Electron dev build can damage files in your Twine stories folder. Back up your stories folder before proceeding.

### Release build
```bash
npm run build
```

Finished files will be found under `dist/`.

Building Windows apps on macOS or Linux requires **Wine** and **makensis**.

A file named `2.json` is created under `dist/` which contains information relevant to the autoupdater process.

---

## Tests

```bash
npm test
```

---

## License

This project remains under the same license terms as TwineJS (see `LICENSE` and other included license files).  
If you redistribute builds, you must also make the corresponding source available (this repo satisfies that).
