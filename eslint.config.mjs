import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

/**
 * ESLint flat config.
 *
 * eslint-config-next 16 ships native flat configs, so they are spread in
 * directly — no FlatCompat shim, which is what the eslintrc bridge is for and
 * which chokes on this plugin graph.
 */
const config = [
  {
    ignores: [
      '.next/**',
      '.open-next/**',
      '.wrangler/**',
      'node_modules/**',
      'next-env.d.ts',
      'cloudflare-env.d.ts',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // We deliberately use a plain <img> with a hand-built srcset: image
      // optimisation is unavailable on Cloudflare Workers without a paid
      // service, so the sizes are generated at upload time instead. See
      // lib/media/resize.ts and components/ui/Picture.tsx.
      '@next/next/no-img-element': 'off',
    },
  },
]

export default config
