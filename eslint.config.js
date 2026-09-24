// Vérifications de code (npm run lint). Règles Expo + React ; l'accessibilité et les hooks sont en avertissement
// pour ne pas bloquer, on les durcit progressivement.
const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    ignores: ['dist/**', 'node_modules/**', '.expo/**', 'backend/**', 'scripts/**', 'install-site/**', 'public/**'],
  },
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      'react/display-name': 'off',
      'import/no-unresolved': 'off',
      // Règles « React Compiler » : à traiter progressivement (373 occurrences), pas bloquantes.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react/no-unescaped-entities': 'off',
    },
  },
];
