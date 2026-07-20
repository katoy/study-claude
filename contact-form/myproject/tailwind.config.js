import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                brand: {
                    primary: 'rgb(var(--color-brand-primary) / <alpha-value>)',
                    action: 'rgb(var(--color-brand-action) / <alpha-value>)',
                    'action-hover': 'rgb(var(--color-brand-action-hover) / <alpha-value>)',
                    light: 'rgb(var(--color-brand-light) / <alpha-value>)',
                    dark: 'rgb(var(--color-brand-dark) / <alpha-value>)',
                    border: 'rgb(var(--color-brand-border) / <alpha-value>)',
                    text: 'rgb(var(--color-brand-text) / <alpha-value>)',
                    success: 'rgb(var(--color-brand-success) / <alpha-value>)',
                    error: 'rgb(var(--color-brand-error) / <alpha-value>)',
                    warning: 'rgb(var(--color-brand-warning) / <alpha-value>)',
                },
            },
        },
    },

    plugins: [forms],
};
