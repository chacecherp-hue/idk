# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## Commands

**Install Dependencies**

```console
npm i --loglevel=error
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## CHERP product film

`CherpFilm` is a 15 s, 1920×1080, 30 fps product film. Its source is in `src/Cherp/`.
The pieces are modelled from the CAD reference in `public/reference/cad-reference.png`
and rendered in Three.js as cast concrete.

```console
npx remotion render CherpFilm out/cherp-film.mp4
```

| File | What it holds |
| --- | --- |
| `dimensions.ts` | Every size and position of the product, read off the reference. Adjust geometry here. |
| `geometry.ts` | Filleted castings with their pockets and slots cut out by CSG. |
| `concrete.ts` | Procedural solid-texture concrete: tonal drift, mottle, sand grain, aggregate and pinholes. |
| `Product.tsx` | The three castings, incense sticks with embers, and the lighter. |
| `Smoke.tsx` | Incense smoke shader, driven by the frame number so renders are repeatable. |
| `Stage.tsx` | Charcoal plinth and room, warm off-white wall, key, rim and wall-wash lights. |
| `camera.ts` | The shots: low-angle reveal, 180° orbit, macro, push-in to hero. |
| `PostFX.tsx` | Ambient occlusion, depth of field, bloom, ACES tone mapping, vignette and grain. |

On a machine without a GPU, render with software WebGL: add `--gl=swangle`.
Each frame then takes around 20–30 s.

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
