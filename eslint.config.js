import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  ...pluginVue.configs['flat/recommended'],
  {
    rules: {
      'vue/no-v-html': 'off',
    },
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    }
  }
]