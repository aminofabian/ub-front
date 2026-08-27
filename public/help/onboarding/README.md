# Onboarding email shots

Served at `/help/onboarding/*`.

- `*.png` / `m2-*.jpg` — what tip emails embed today (1200px-wide raster exports)
- `*.svg` — source masters for the non-photo illustrations

Regenerate rasters after editing an SVG:

```bash
npx --yes @resvg/resvg-js-cli --fit-width 1200 m1-fill-shelf.svg m1-fill-shelf.png
sips -s format jpeg -s formatOptions 85 m2-sizes.png --out m2-sizes.jpg  # M2 only
```

See `docs/onboarding-sequence/SHOTS.md`.
