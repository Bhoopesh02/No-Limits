import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const ALL_MODULES = [
  'core',
  'data',
  'input',
  'vehicle',
  'ai',
  'race',
  'environment',
  'audio',
  'render',
  'services',
  'ui',
  'app',
];

const ALLOWED_MODULES = {
  core: [],
  data: [],
  input: ['core', 'data'],
  vehicle: ['core', 'data'],
  ai: ['core', 'data'],
  race: ['core', 'data'],
  environment: ['core', 'data'],
  audio: ['core', 'data'],
  render: ['core', 'data'],
  services: ['core', 'data'],
  ui: ['core', 'data', 'services'],
  app: ALL_MODULES.filter((m) => m !== 'app'),
};

const NO_THREE_MODULES = new Set(['core', 'vehicle', 'ai', 'race']);

const moduleBoundaryConfigs = ALL_MODULES.map((mod) => {
  const allowed = ALLOWED_MODULES[mod] ?? [];
  const disallowed = ALL_MODULES.filter((m) => m !== mod && !allowed.includes(m));

  const patterns = [];

  for (const target of disallowed) {
    patterns.push({
      group: [
        `../${target}`,
        `../${target}/**`,
        `../../${target}`,
        `../../${target}/**`,
        `**/${target}`,
        `**/${target}/**`,
      ],
      message: `Module "${mod}" is not allowed to import from module "${target}". Allowed modules: [${allowed.join(', ') || 'none'}].`,
    });
  }

  if (NO_THREE_MODULES.has(mod)) {
    patterns.push({
      group: ['three', 'three/**'],
      message: `Simulation module "${mod}" must never import "three".`,
    });
  }

  return {
    files: [`src/${mod}/**/*.{ts,tsx,js,jsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns,
        },
      ],
    },
  };
});

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'ai_studio_code.js'],
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-exports': [
        'error',
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },
  ...moduleBoundaryConfigs,
);
