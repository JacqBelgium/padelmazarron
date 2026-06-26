/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EBF3FB',
          100: '#D6E4F0',
          500: '#1F5C99',
          600: '#1A4E82',
          700: '#143D65',
        }
      }
    },
  },
  plugins: [],
}
