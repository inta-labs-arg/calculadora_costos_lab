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
          blue:          "#00548F",
          "blue-dark":   "#003F6B",
          "blue-mid":    "#C5DCF0",
          "blue-light":  "#EBF4FB",
          green:         "#7BB342",
          "green-light": "#EEF6E5",
          orange:        "#F39200",
          "orange-light":"#FEF3E0",
          red:           "#D94040",
          "red-light":   "#FDEAEA",
          gray: {
            "50":  "#F8F9FA",
            "100": "#F1F3F5",
            "200": "#E9ECEF",
            "300": "#DEE2E6",
            "400": "#ADB5BD",
            "500": "#868E96",
            "600": "#495057",
            "700": "#343A40",
            "800": "#212529",
          }
        }
      }
    }
  },
  plugins: []
};

export default config;
