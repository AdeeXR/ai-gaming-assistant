// postcss.config.mjs
// This configuration file tells PostCSS how to process your CSS.
// It's used by Next.js for integrating Tailwind CSS and Autoprefixer.

export default { // Use export default for .mjs
  plugins: {
    // For Tailwind CSS v3, use 'tailwindcss'
    tailwindcss: {},
    autoprefixer: {},
  },
};