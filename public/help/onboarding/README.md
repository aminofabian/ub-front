# Onboarding email shots

Served at `/help/onboarding/*`.

- `*.png` / `m2-*.jpg` — live Powerstar captures (Aug 2026), resized to 1200px wide for email
- `*.svg` — legacy annotated mockups (source masters; regenerate rasters only if re-shooting is unavailable)

Regenerate rasters after editing an SVG mockup:

```bash
npx --yes @resvg/resvg-js-cli --fit-width 1200 m1-fill-shelf.svg m1-fill-shelf.png
sips -s format jpeg -s formatOptions 85 m2-sizes.png --out m2-sizes.jpg  # M2 only
```

Live re-capture checklist: `docs/onboarding-sequence/SHOTS.md`.
