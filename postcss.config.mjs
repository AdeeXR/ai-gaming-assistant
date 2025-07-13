// postcss.config.mjs
// This configuration file tells PostCSS how to process your CSS.
// It's used by Next.js for integrating Tailwind CSS and Autoprefixer.

// Using `export default` for ES Modules syntax
export default {
  plugins: {
    // For Tailwind CSS v4, use '@tailwindcss/postcss'
    '@tailwindcss/postcss': {}, // This line is correct for v4
    autoprefixer: {}, // Autoprefixer remains the same
  },
};
