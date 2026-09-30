import { useFrame, useThree } from "@react-three/fiber";
// @ts-expect-error n8ao ships without type declarations
import { N8AOPostPass } from "n8ao";
import {
  BlendFunction,
  BloomEffect,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from "postprocessing";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

// The photographic finish: ambient occlusion in corners and recesses, depth
// of field for the macro, a restrained bloom on the embers, filmic tone
// mapping, vignette and a fine grain.
//
// Built synchronously and rendered from our own useFrame, so it is ready on
// the very first frame Remotion asks R3F to draw (the declarative
// @react-three/postprocessing wrapper attaches its passes a tick too late when
// rendering frame by frame, producing blank frames).

export const PostFX: React.FC<{
  focusTarget: THREE.Vector3;
  focusRange: number;
  bokeh: number;
}> = ({ focusTarget, focusRange, bokeh }) => {
  const { gl, scene, camera, size } = useThree();

  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 4,
    });
    composer.addPass(new RenderPass(scene, camera));

    const ao = new N8AOPostPass(scene, camera, size.width, size.height);
    ao.configuration.aoRadius = 1.4;
    ao.configuration.distanceFalloff = 0.6;
    ao.configuration.intensity = 2.4;
    ao.configuration.aoSamples = 16;
    ao.configuration.denoiseSamples = 8;
    ao.configuration.denoiseRadius = 8;
    ao.configuration.halfRes = false;
    ao.configuration.gammaCorrection = false;
    composer.addPass(ao);

    const dof = new DepthOfFieldEffect(camera, {
      focusRange: 1.5,
      bokehScale: 0,
      resolutionScale: 0.5,
    });
    const bloom = new BloomEffect({
      intensity: 0.45,
      luminanceThreshold: 1.1,
      luminanceSmoothing: 0.25,
      mipmapBlur: true,
      radius: 0.55,
    });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    const vignette = new VignetteEffect({ offset: 0.22, darkness: 0.68 });
    const grain = new NoiseEffect({
      premultiply: true,
      blendFunction: BlendFunction.SOFT_LIGHT,
    });
    grain.blendMode.opacity.value = 0.18;

    composer.addPass(new EffectPass(camera, dof));
    composer.addPass(new EffectPass(camera, bloom, tone, vignette, grain));
    composer.setSize(size.width, size.height);
    return { composer, dof };
  }, [gl, scene, camera, size.width, size.height]);

  useLayoutEffect(() => {
    return () => fx.composer.dispose();
  }, [fx]);

  // Per-frame focus.
  fx.dof.target = focusTarget;
  fx.dof.cocMaterial.focusRange = focusRange;
  fx.dof.bokehScale = bokeh;

  useFrame((_, delta) => {
    fx.composer.render(delta);
  }, 1);

  return null;
};
