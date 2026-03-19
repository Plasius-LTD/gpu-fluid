import type {
  FluidContinuityBandInput,
  FluidContinuityBandSettings,
  FluidContinuityEnvelope,
  FluidContinuityEnvelopeInput,
  FluidRepresentationBand,
} from "./types.js";
import { fluidRepresentationBands } from "./types.js";
import {
  assertIdentifier,
  assertFinitePositiveNumber,
  assertRatio,
  normalizeFluidContinuityStrategy,
} from "./validation.js";

const fluidBandInheritance: Readonly<
  Record<FluidRepresentationBand, FluidRepresentationBand | undefined>
> = Object.freeze({
  near: undefined,
  mid: "near",
  far: "mid",
  horizon: "far",
});

const defaultBandInputs: Readonly<
  Record<FluidRepresentationBand, Required<FluidContinuityBandInput>>
> = Object.freeze({
  near: Object.freeze({
    blendWindowMeters: 6,
    amplitudeFloor: 1,
    frequencyFloor: 1,
    retainFoamHistory: true,
    retainLowFrequencyWaves: true,
    retainDirectionality: true,
  }),
  mid: Object.freeze({
    blendWindowMeters: 14,
    amplitudeFloor: 0.72,
    frequencyFloor: 0.78,
    retainFoamHistory: true,
    retainLowFrequencyWaves: true,
    retainDirectionality: true,
  }),
  far: Object.freeze({
    blendWindowMeters: 32,
    amplitudeFloor: 0.34,
    frequencyFloor: 0.42,
    retainFoamHistory: false,
    retainLowFrequencyWaves: true,
    retainDirectionality: true,
  }),
  horizon: Object.freeze({
    blendWindowMeters: 72,
    amplitudeFloor: 0.16,
    frequencyFloor: 0.18,
    retainFoamHistory: false,
    retainLowFrequencyWaves: true,
    retainDirectionality: true,
  }),
});

function buildBandSettings(
  band: FluidRepresentationBand,
  input: FluidContinuityBandInput | undefined
): FluidContinuityBandSettings {
  const defaults = defaultBandInputs[band];

  return Object.freeze({
    inheritsFromBand: fluidBandInheritance[band],
    blendWindowMeters:
      input?.blendWindowMeters === undefined
        ? defaults.blendWindowMeters
        : assertFinitePositiveNumber(
            `continuity.bands.${band}.blendWindowMeters`,
            input.blendWindowMeters
          ),
    amplitudeFloor:
      input?.amplitudeFloor === undefined
        ? defaults.amplitudeFloor
        : assertRatio(
            `continuity.bands.${band}.amplitudeFloor`,
            input.amplitudeFloor
          ),
    frequencyFloor:
      input?.frequencyFloor === undefined
        ? defaults.frequencyFloor
        : assertRatio(
            `continuity.bands.${band}.frequencyFloor`,
            input.frequencyFloor
          ),
    retainFoamHistory: input?.retainFoamHistory ?? defaults.retainFoamHistory,
    retainLowFrequencyWaves:
      input?.retainLowFrequencyWaves ?? defaults.retainLowFrequencyWaves,
    retainDirectionality:
      input?.retainDirectionality ?? defaults.retainDirectionality,
  });
}

/**
 * Creates the normalized continuity envelope shared across all fluid
 * representation bands.
 */
export function createFluidContinuityEnvelope(
  input: FluidContinuityEnvelopeInput
): FluidContinuityEnvelope {
  const fluidBodyId = assertIdentifier("fluidBodyId", input.fluidBodyId);
  const continuityGroupId = input.continuityGroupId
    ? assertIdentifier("continuityGroupId", input.continuityGroupId)
    : `${fluidBodyId}.continuity`;
  const waveFieldId = input.waveFieldId
    ? assertIdentifier("waveFieldId", input.waveFieldId)
    : `${fluidBodyId}.wave-field`;
  const strategy = input.strategy
    ? normalizeFluidContinuityStrategy(input.strategy)
    : "shared-spectrum";

  const bands = Object.freeze(
    Object.fromEntries(
      fluidRepresentationBands.map((band) => [
        band,
        buildBandSettings(band, input.bands?.[band]),
      ])
    ) as Record<FluidRepresentationBand, FluidContinuityBandSettings>
  );

  return Object.freeze({
    schemaVersion: 1,
    owner: "fluid",
    fluidBodyId,
    continuityGroupId,
    waveFieldId,
    strategy,
    bands,
  });
}
