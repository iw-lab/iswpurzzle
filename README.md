# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## 배포 (2026-08-22 갱신)

🔴 **학생이 여는 주소는 `https://chromafall.pages.dev` 입니다.**
교육청 네트워크가 `github.io` 를 **도메인째** 막습니다(ERR_TIMED_OUT).

`main` 에 푸시하면 `.github/workflows/deploy.yml` 이 게이트(eslint · vitest · tsc+build)를
돌리고 Cloudflare Pages 로 올립니다. 그 배포는 저장소 시크릿 두 개가 있어야 돕니다 —
없으면 **경고를 남기고 건너뜁니다**(조용히 실패하지 않습니다):

| 시크릿 | 어디서 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → **Edit Cloudflare Workers** 템플릿 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 대시보드 우측 Account ID |

시크릿을 넣기 전까지는 손으로:

```bash
npm run build
npx wrangler pages deploy dist --project-name chromafall --branch main
```

⚠️ `package.json` 의 `deploy: gh-pages -d dist` 는 **옛 경로**입니다(차단되는 주소로 나갑니다).
남겨 두었지만 쓰지 마세요.

⚠️ CI 를 왜 이제 만들었나: 게이트(테스트 75개·eslint·tsc)는 **원래 있었는데 아무도 안 돌렸습니다.**
형제 앱에서 같은 구조 때문에 CI 초록불을 받은 변경이 학생에게 도달하지 않은 사고가 실제로
났습니다(2026-08-22).
