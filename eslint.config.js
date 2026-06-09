import js from '@eslint/js'
import globals from 'globals'
import configPrettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import playwright from 'eslint-plugin-playwright'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import vue from 'eslint-plugin-vue'

const browserGlobals = {
  ...globals.browser,
  ...globals.es2024
}

const nodeGlobals = {
  ...globals.node,
  ...globals.es2024
}

const importRules = {
  'import/first': 'error',
  'import/newline-after-import': 'error',
  'import/no-duplicates': 'error'
}

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'playwright-report/**',
      'test-results/**',
      '.pnpm-store/**',
      '.specstory/**',
      '.specstory-cache/**',
      '.specstory-cache-v2/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals
    },
    plugins: {
      import: importPlugin
    },
    rules: {
      'no-debugger': 'error',
      'no-implicit-globals': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_'
        }
      ],
      ...importRules
    }
  },
  {
    files: ['**/*.config.js', 'eslint.config.js', 'prettier.config.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        ...nodeGlobals,
        __dirname: 'readonly'
      }
    },
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['apps/main/**/*.{js,jsx}', 'apps/react-dashboard/**/*.{js,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
      'react/prop-types': 'off'
    }
  },
  ...vue.configs['flat/essential'],
  {
    files: ['apps/vue3-app/**/*.{js,vue}'],
    languageOptions: {
      globals: browserGlobals
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'error'
    }
  },
  {
    files: ['tests/e2e/**/*.js'],
    ...playwright.configs['flat/recommended'],
    languageOptions: {
      ...playwright.configs['flat/recommended'].languageOptions,
      globals: {
        ...nodeGlobals,
        ...playwright.configs['flat/recommended'].languageOptions?.globals
      }
    }
  },
  configPrettier
]
