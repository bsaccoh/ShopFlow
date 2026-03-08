/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    500: '#14b8a6', // Teal brand primary
                    600: '#0d9488',
                    700: '#0f766e',
                    900: '#134e4a',
                },
                dark: {
                    bg: '#0f172a',    // slate-900
                    card: '#1e293b',  // slate-800
                    border: '#334155' // slate-700
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
