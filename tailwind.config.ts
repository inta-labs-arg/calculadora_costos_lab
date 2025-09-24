import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        inta: {
          blue: "#00548F",
          green: "#7BB342",
          orange: "#F39200",
          gray: "#4D4D4F"
        }
      }
    }
  },
  plugins: []
};

export default config;
