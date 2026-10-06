// Cấu hình ESLint cho toàn bộ repo. Root package.json đặt "type": "module" nên ở đây
// dùng flat config; server/ và client/ có package.json riêng quyết định mô-đun của
// chính source code của chúng.
import js from '@eslint/js';
import globals from 'globals';

const COMMON = {
    rules: {
        ...js.configs.recommended.rules,
        // Biến dùng trước khi khai báo: đây là loại lỗi làm sập server lúc chạy
        // (ví dụ helper bị xóa khi dời code mà không ai gọi tới route đó).
        'no-undef': 'error',
        'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
        'no-empty': ['warn', { allowEmptyCatch: true }],
        eqeqeq: ['error', 'smart'],
        'no-var': 'error',
        'prefer-const': 'warn'
    }
};

export default [
    {
        ignores: [
            'client/dist/**',
            '**/node_modules/**',
            'data/**',
            'scripts/**'
        ]
    },
    {
        ...COMMON,
        files: ['server/**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'commonjs',
            globals: { ...globals.node }
        }
    },
    {
        ...COMMON,
        files: ['client/src/**/*.js', 'client/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                // Reveal.js và KaTeX nạp từ CDN trong template HTML publish, không import
                Reveal: 'readonly',
                katex: 'readonly',
                renderMathInElement: 'readonly'
            }
        }
    },
    {
        ...COMMON,
        // cf_setup.js và các script ở thư mục gốc theo kiểu CommonJS
        files: ['*.js'],
        excludedFiles: ['eslint.config.js', 'client/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'commonjs',
            globals: { ...globals.node }
        }
    }
];
