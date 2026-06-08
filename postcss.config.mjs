// Tailwind v4 emits modern CSS colour functions (`oklch()` and
// `color-mix()`) for every theme token and `/opacity` utility. Browsers older
// than Chrome 111 / Safari 16.2 (notably the last Chrome on Windows 7/8,
// Chrome 109) cannot parse them, so those colours collapse to `transparent` —
// invisible buttons and see-through drawer panels.
//
// These two plugins run AFTER Tailwind and add an `rgb()`/`rgba()` fallback in
// front of each modern declaration, keeping the original behind an `@supports`
// guard for capable browsers. This makes the whole UI render on legacy OSes
// without having to hand-edit individual components.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "@csstools/postcss-oklab-function": { preserve: true },
    "@csstools/postcss-color-mix-function": { preserve: true },
  },
};

export default config;
