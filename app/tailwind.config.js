module.exports = {
  content: ["./index.html", "./src/**/*"],
  theme: {
    extend: {
      colors: {
        mg: {
          bool: "#DC2626",
          event: "#C20000",
          string: "#DA5697",
          exec: "#2163EB",
          int: "#30F3DB",
          pure: "#008E62",
          float: "#00AE75",
          graph: "#262626",
          base: "#696969",
          current: "var(--mg-current)",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
