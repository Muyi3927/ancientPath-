/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef8ee',
          100: '#fdf0d6',
          200: '#fbd9a8',
          300: '#f8bf70',
          400: '#f59e38',
          500: '#f27d12',
          600: '#e36208',
          700: '#bc4a09',
          800: '#963a0f',
          900: '#7a3110',
        },
        warm: {
          50: '#fdfaf5',
          100: '#f9f2e7',
          200: '#f2e4cc',
          300: '#e8d0a8',
        },
        surface: {
          DEFAULT: '#ffffff',
          alt: '#faf8f5',
        },
        border: {
          DEFAULT: '#e8ddd0',
          light: '#f0e8dc',
        },
      },
    },
  },
  plugins: [],
}

