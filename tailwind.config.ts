import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    // Crucial: Ensure this line is present to scan all files in src/
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'], // This is good
      },
      colors: {
        // Your custom colors are fine here
        'gray-900': '#111827',
        'gray-800': '#1F2937',
        'gray-700': '#374151',
        'gray-600': '#4B5563',
        'gray-500': '#6B7280',
        'gray-400': '#9CA3AF',
        'gray-300': '#D1D5DB',
        'gray-200': '#E5E7EB',
        'gray-100': '#F3F4F6',
        'teal-400': '#2DD4BF',
        'teal-500': '#14B8A6',
        'teal-600': '#0D9488',
        'purple-400': '#C084FC',
        'purple-500': '#A855F7',
        'purple-600': '#9333EA',
        'blue-500': '#3B82F6',
        'blue-600': '#2563EB',
        'green-500': '#22C55E',
        'green-600': '#16A34A',
        'red-500': '#EF4444',
        'orange-400': '#FB923C',
        'yellow-400': '#FACC15',
      },
      keyframes: {
        fadeInDown: {
          'from': { opacity: '0', transform: 'translateY(-20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-down': 'fadeInDown 0.6s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;