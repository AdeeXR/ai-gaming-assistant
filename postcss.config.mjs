// postcss.config.mjs
// This configuration file tells PostCSS how to process your CSS.
// It's used by Next.js for integrating Tailwind CSS and Autoprefixer.

export default {
  plugins: {
    // Use the new @tailwindcss/postcss plugin
    '@tailwindcss/postcss': {}, // <--- IMPORTANT: This line is changed
    autoprefixer: {}, // Autoprefixer remains the same
  },
};