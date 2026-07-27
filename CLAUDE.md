# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A portfolio/website for artist Frank Kirwan (see `<title>` in `index.html`). Built on Vite's `react` template. The codebase is currently minimal/early-stage: a single placeholder `App.jsx` component, no routes, no tests, and no component library set up yet.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — production build (output to `dist/`)
- `npm run preview` — serve the production build locally
- `npm run lint` — run Oxlint (config in `.oxlintrc.json`)

There is no test runner configured in this repo.

## Architecture

- **Build tool**: Vite (`vite.config.js`), using `@vitejs/plugin-react` (Oxc-based, not SWC).
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin — imported with a single `@import "tailwindcss";` in `src/index.css`. There is no `tailwind.config.js`; v4 is configured through CSS/Vite plugin, not a JS config file.
- **Entry point**: `src/main.jsx` mounts `<App />` into `#root` (defined in `index.html`) inside `React.StrictMode`.
- **Routing**: `react-router-dom` (v7) is a dependency but not yet wired up in `App.jsx` — routes will need to be added when multi-page navigation is introduced.
- **Linting**: Oxlint with `react` and `oxc` plugins enabled; `react/rules-of-hooks` is an error, `react/only-export-components` is a warning.

## Notes

- No TypeScript — this is a plain JS/JSX React project (though `@types/react` and `@types/react-dom` are present for editor intellisense).
- No React Compiler — intentionally left off in this template for dev/build performance (see `README.md`).
