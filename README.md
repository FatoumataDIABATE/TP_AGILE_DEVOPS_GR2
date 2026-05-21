# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # TP_AGILE_DEVOPS_GR2

  Application React/Vite dockerisée avec une API Node/Express et une base PostgreSQL pour stocker des événements.

  ## Lancer avec Docker

  ```powershell
  docker compose up --build
  ```

  L’application web sera disponible sur `http://localhost:3000` et l’API sur `http://localhost:3001`.

  ## Structure

  - `src/`: interface React
  - `backend/`: API d’événements et schéma PostgreSQL
  - `docker-compose.yml`: orchestration de l’ensemble

  ## Démarrage local

  ```powershell
  Set-Location .
  npm run dev
  ```

  Pour l’interface seule, il faut aussi lancer l’API dans `backend/` avec `npm install` puis `npm run dev`.
You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:
