# AGENTS.md - Earth Globe Project

## Project Type

Three.js 3D Earth visualization with realistic terrain, atmosphere, aurora, city labels, and animated fleet.

## Dev Commands

```bash
npm run dev      # Dev server at http://localhost:5173
npm run build    # Build to dist/
npm run preview  # Preview built app
```

## Architecture

- **Entry**: `src/main.js` - async IIFE that preloads models
- **Scene assembly**: `src/Scene.js` - creates scene group, lighting, starfield
- **Core modules**: `Earth.js`, `Atmosphere.js`, `Aurora.js`, `Clouds.js`, `Labels.js`
- **Fleet system**: `Fleet.js` - loads GLB models, animates vehicles around Earth
- **Shaders**: inline GLSL in `Earth.js` for day/night blending, bump mapping

## No tests

This project has no test suite configured.

## No linting

No ESLint, Prettier, or other linting configured. Code uses vanilla JavaScript patterns.

## Key Quirks

- Textures loaded from unpkg CDN (three-globe@2.31.1)
- `createScene()` is async - preloads all GLB models via ModelCache
- Fleet vehicles parented to Earth group, rotate with it
- OrbitControls with damping enabled
- Custom shader for day/night transition based on sun direction