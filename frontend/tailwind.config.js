module.exports = {
    darkMode: 'class',
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                kmuGreen: {
                    DEFAULT: '#008542', // Main green
                    dark: '#005c2a',
                    light: '#33a86d'
                },
                kmuOrange: {
                    DEFAULT: '#ff8200', // Main orange
                    dark: '#cc6900',
                    light: '#ffab40'
                }
            }
        }
    },
    plugins: []
};