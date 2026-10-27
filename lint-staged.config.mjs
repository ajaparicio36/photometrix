export default {
  'app/**/*.{js,jsx,ts,tsx,mjs,cjs}': 'pnpm --dir app exec eslint --max-warnings 0',
  'server/**/*.{js,ts,mjs,cjs}': 'pnpm --dir server exec eslint --max-warnings 0',
  '{scripts/**/*.mjs,*.mjs}': 'pnpm exec eslint --max-warnings 0',
  '*': 'pnpm exec prettier --check --ignore-unknown',
};
