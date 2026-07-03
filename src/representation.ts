import { createFluidContinuityEnvelope } from "./continuity.js";
import type {
  FluidBodyKind,
  FluidProfileName,
  FluidRangeThresholds,
  FluidRepresentationBand,
  FluidRepresentationDescriptor,
  FluidRepresentationPlan,
  FluidRepresentationPlanOptions,
} from "./types.js";
import { fluidRepresentationBands } from "./types.js";
import {
  assertFiniteNonNegativeNumber,
  assertFinitePositiveNumber,
  assertIdentifier,
  normalizeFluidBodyKind,
  normalizeFluidProfile,
} from "./validation.js";

type BandDescriptorSpec = Omit<
  FluidRepresentationDescriptor,
  | "id"
  | "fluidBodyId"
  | "kind"
  | "profile"
  | "band"
  | "continuity"
  | "material"
  | "medium"
>;

type ProfileRepresentationSpec = Record<FluidRepresentationBand, BandDescriptorSpec>;

const profileRepresentationSpecs: Readonly<
  Record<FluidProfileName, ProfileRepresentationSpec>
> = Object.freeze({
  interactive: Object.freeze({
    near: Object.freeze({
      output: "liveSurface",
      mesh: Object.freeze({
        patchSizeMeters: 0.5,
        subdivisions: 256,
        activeWaveOctaves: 8,
        foamLayers: 3,
      }),
      updateCadenceDivisor: 1,
      rtParticipation: "full",
      shadowMode: "ray-traced-primary",
      shading: Object.freeze({
        mode: "full",
        caustics: true,
        reflectionMode: "full",
      }),
      performance: Object.freeze({
        owner: "fluid",
        queueClass: "render",
        priorityHint: 460,
        importance: "critical",
        representationBand: "near",
        qualityDimensions: Object.freeze({
          geometry: 1,
          shading: 1,
          rayTracing: 1,
          updateCadence: 1,
          temporalReuse: 0.2,
        }),
        importanceSignals: Object.freeze({
          visible: true,
          playerRelevant: true,
          imageCritical: true,
          motionClass: "dynamic",
          shadowSignificance: "high",
        }),
      }),
    }),
    mid: Object.freeze({
      output: "simplifiedSurface",
      mesh: Object.freeze({
        patchSizeMeters: 1.5,
        subdivisions: 128,
        activeWaveOctaves: 6,
        foamLayers: 2,
      }),
      updateCadenceDivisor: 1,
      rtParticipation: "selective",
      shadowMode: "selective-raster",
      shading: Object.freeze({
        mode: "balanced",
        caustics: true,
        reflectionMode: "selective",
      }),
      performance: Object.freeze({
        owner: "fluid",
        queueClass: "render",
        priorityHint: 330,
        importance: "high",
        representationBand: "mid",
        qualityDimensions: Object.freeze({
          geometry: 0.72,
          shading: 0.72,
          rayTracing: 0.58,
          updateCadence: 0.72,
          temporalReuse: 0.5,
        }),
        importanceSignals: Object.freeze({
          visible: true,
          playerRelevant: true,
          imageCritical: false,
          motionClass: "dynamic",
          shadowSignificance: "medium",
        }),
      }),
    }),
    far: Object.freeze({
      output: "mergedProxy",
      mesh: Object.freeze({
        patchSizeMeters: 6,
        subdivisions: 48,
        activeWaveOctaves: 4,
        foamLayers: 1,
      }),
      updateCadenceDivisor: 3,
      rtParticipation: "proxy",
      shadowMode: "proxy-caster",
      shading: Object.freeze({
        mode: "proxy",
        caustics: false,
        reflectionMode: "proxy",
      }),
      performance: Object.freeze({
        owner: "fluid",
        queueClass: "render",
        priorityHint: 210,
        importance: "medium",
        representationBand: "far",
        qualityDimensions: Object.freeze({
          geometry: 0.32,
          shading: 0.38,
          rayTracing: 0.2,
          updateCadence: 0.25,
          temporalReuse: 0.9,
        }),
        importanceSignals: Object.freeze({
          visible: true,
          playerRelevant: false,
          imageCritical: false,
          motionClass: "stable",
          shadowSignificance: "medium",
        }),
      }),
    }),
    horizon: Object.freeze({
      output: "horizonShell",
      mesh: Object.freeze({
        patchSizeMeters: 24,
        subdivisions: 12,
        activeWaveOctaves: 2,
        foamLayers: 0,
      }),
      updateCadenceDivisor: 8,
      rtParticipation: "disabled",
      shadowMode: "baked-impression",
      shading: Object.freeze({
        mode: "horizon",
        caustics: false,
        reflectionMode: "disabled",
      }),
      performance: Object.freeze({
        owner: "fluid",
        queueClass: "render",
        priorityHint: 110,
        importance: "low",
        representationBand: "horizon",
        qualityDimensions: Object.freeze({
          geometry: 0.12,
          shading: 0.14,
          rayTracing: 0,
          updateCadence: 0.1,
          temporalReuse: 1,
        }),
        importanceSignals: Object.freeze({
          visible: true,
          playerRelevant: false,
          imageCritical: false,
          motionClass: "stable",
          shadowSignificance: "low",
        }),
      }),
    }),
  }),
  cinematic: Object.freeze({
    near: Object.freeze({
      output: "liveSurface",
      mesh: Object.freeze({
        patchSizeMeters: 0.35,
        subdivisions: 320,
        activeWaveOctaves: 9,
        foamLayers: 4,
      }),
      updateCadenceDivisor: 1,
      rtParticipation: "full",
      shadowMode: "ray-traced-primary",
      shading: Object.freeze({
        mode: "full",
        caustics: true,
        reflectionMode: "full",
      }),
      performance: Object.freeze({
        owner: "fluid",
        queueClass: "render",
        priorityHint: 500,
        importance: "critical",
        representationBand: "near",
        qualityDimensions: Object.freeze({
          geometry: 1,
          shading: 1,
          rayTracing: 1,
          updateCadence: 1,
          temporalReuse: 0.1,
        }),
        importanceSignals: Object.freeze({
          visible: true,
          playerRelevant: true,
          imageCritical: true,
          motionClass: "dynamic",
          shadowSignificance: "critical",
        }),
      }),
    }),
    mid: Object.freeze({
      output: "simplifiedSurface",
      mesh: Object.freeze({
        patchSizeMeters: 1,
        subdivisions: 192,
        activeWaveOctaves: 7,
        foamLayers: 3,
      }),
      updateCadenceDivisor: 1,
      rtParticipation: "selective",
      shadowMode: "selective-raster",
      shading: Object.freeze({
        mode: "balanced",
        caustics: true,
        reflectionMode: "selective",
      }),
      performance: Object.freeze({
        owner: "fluid",
        queueClass: "render",
        priorityHint: 360,
        importance: "high",
        representationBand: "mid",
        qualityDimensions: Object.freeze({
          geometry: 0.8,
          shading: 0.78,
          rayTracing: 0.64,
          updateCadence: 0.74,
          temporalReuse: 0.45,
        }),
        importanceSignals: Object.freeze({
          visible: true,
          playerRelevant: true,
          imageCritical: true,
          motionClass: "dynamic",
          shadowSignificance: "high",
        }),
      }),
    }),
    far: Object.freeze({
      output: "mergedProxy",
      mesh: Object.freeze({
        patchSizeMeters: 4,
        subdivisions: 80,
        activeWaveOctaves: 5,
        foamLayers: 1,
      }),
      updateCadenceDivisor: 2,
      rtParticipation: "proxy",
      shadowMode: "proxy-caster",
      shading: Object.freeze({
        mode: "proxy",
        caustics: false,
        reflectionMode: "proxy",
      }),
      performance: Object.freeze({
        owner: "fluid",
        queueClass: "render",
        priorityHint: 220,
        importance: "medium",
        representationBand: "far",
        qualityDimensions: Object.freeze({
          geometry: 0.4,
          shading: 0.42,
          rayTracing: 0.24,
          updateCadence: 0.34,
          temporalReuse: 0.88,
        }),
        importanceSignals: Object.freeze({
          visible: true,
          playerRelevant: false,
          imageCritical: false,
          motionClass: "stable",
          shadowSignificance: "medium",
        }),
      }),
    }),
    horizon: Object.freeze({
      output: "horizonShell",
      mesh: Object.freeze({
        patchSizeMeters: 18,
        subdivisions: 18,
        activeWaveOctaves: 2,
        foamLayers: 0,
      }),
      updateCadenceDivisor: 6,
      rtParticipation: "disabled",
      shadowMode: "baked-impression",
      shading: Object.freeze({
        mode: "horizon",
        caustics: false,
        reflectionMode: "disabled",
      }),
      performance: Object.freeze({
        owner: "fluid",
        queueClass: "render",
        priorityHint: 120,
        importance: "low",
        representationBand: "horizon",
        qualityDimensions: Object.freeze({
          geometry: 0.14,
          shading: 0.18,
          rayTracing: 0,
          updateCadence: 0.12,
          temporalReuse: 1,
        }),
        importanceSignals: Object.freeze({
          visible: true,
          playerRelevant: false,
          imageCritical: false,
          motionClass: "stable",
          shadowSignificance: "low",
        }),
      }),
    }),
  }),
});

function createFluidMediumDescriptor(
  fluidBodyId: string,
  band: FluidRepresentationBand,
  profile: FluidProfileName
) {
  const denseProfile = profile === "cinematic";
  const nearBand = band === "near";
  const horizonBand = band === "horizon";
  const density = horizonBand ? 0.02 : nearBand ? (denseProfile ? 0.22 : 0.18) : 0.08;

  return Object.freeze({
    id: `${fluidBodyId}.${band}.water-medium`,
    density,
    attenuationColor: Object.freeze(
      horizonBand ? [0.74, 0.82, 0.88, 1] : nearBand ? [0.62, 0.81, 0.92, 1] : [0.68, 0.82, 0.9, 1]
    ),
    attenuationDistance: horizonBand ? 40 : nearBand ? 4.5 : 12,
    absorption: Object.freeze(
      nearBand ? [0.18, 0.08, 0.03] : horizonBand ? [0.05, 0.03, 0.02] : [0.09, 0.05, 0.03]
    ),
    scattering: Object.freeze(
      nearBand ? [0.03, 0.04, 0.05] : horizonBand ? [0.005, 0.006, 0.008] : [0.012, 0.015, 0.02]
    ),
  });
}

function createFluidMaterialDescriptor(
  fluidBodyId: string,
  band: FluidRepresentationBand,
  profile: FluidProfileName,
  caustics: boolean
) {
  const cinematic = profile === "cinematic";
  const foam = band === "near" || band === "mid";
  const roughness =
    band === "near" ? (cinematic ? 0.018 : 0.026) : band === "mid" ? 0.05 : band === "far" ? 0.11 : 0.18;
  const foamAmount = band === "near" ? (cinematic ? 0.72 : 0.64) : band === "mid" ? 0.38 : 0.08;

  return Object.freeze({
    id: `${fluidBodyId}.${band}.water-material`,
    shadingModel: "water" as const,
    baseColor: Object.freeze(
      band === "near" ? [0.1, 0.28, 0.38, 1] : band === "mid" ? [0.13, 0.33, 0.43, 1] : [0.18, 0.39, 0.49, 1]
    ),
    roughness,
    metallic: 0,
    opacity: 0.96,
    ior: 1.333,
    transmission: band === "horizon" ? 0.82 : 0.96,
    specular: 0.9,
    emissive: Object.freeze([0, 0, 0]),
    absorption: Object.freeze(
      band === "near" ? [0.18, 0.08, 0.03] : band === "horizon" ? [0.05, 0.03, 0.02] : [0.09, 0.05, 0.03]
    ),
    caustics,
    foam,
    foamAmount,
    normalTexture: Object.freeze({
      kind: "normal" as const,
      assetId: `${fluidBodyId}.water-normal`,
      uvScale: Object.freeze([band === "near" ? 1.5 : 3, band === "near" ? 1.5 : 3]),
      strength: band === "near" ? 1 : 0.7,
    }),
    heightTexture: Object.freeze({
      kind: "height" as const,
      assetId: `${fluidBodyId}.wave-height`,
      uvScale: Object.freeze([1, 1]),
      strength: band === "near" ? 0.08 : band === "mid" ? 0.05 : 0.02,
    }),
    foamTexture: foam
      ? Object.freeze({
          kind: "foam" as const,
          assetId: `${fluidBodyId}.foam-mask`,
          uvScale: Object.freeze([2, 2]),
          strength: foamAmount,
        })
      : null,
    mediumId: `${fluidBodyId}.${band}.water-medium`,
  });
}

function normalizeThresholds(
  nearFieldMaxMeters: unknown,
  midFieldMaxMeters: unknown,
  farFieldMaxMeters: unknown
): FluidRangeThresholds {
  const nearMaxMeters = assertFinitePositiveNumber(
    "nearFieldMaxMeters",
    nearFieldMaxMeters
  );
  const midMaxMeters = assertFinitePositiveNumber(
    "midFieldMaxMeters",
    midFieldMaxMeters
  );
  const farMaxMeters = assertFinitePositiveNumber(
    "farFieldMaxMeters",
    farFieldMaxMeters
  );

  if (!(nearMaxMeters < midMaxMeters && midMaxMeters < farMaxMeters)) {
    throw new Error(
      "Fluid range thresholds must satisfy nearFieldMaxMeters < midFieldMaxMeters < farFieldMaxMeters."
    );
  }

  return Object.freeze({
    nearMaxMeters,
    midMaxMeters,
    farMaxMeters,
  });
}

function buildRepresentationDescriptor(
  fluidBodyId: string,
  kind: FluidBodyKind,
  profile: FluidProfileName,
  band: FluidRepresentationBand,
  supportsRayTracing: boolean,
  thresholds: FluidRangeThresholds,
  options: FluidRepresentationPlanOptions
): FluidRepresentationDescriptor {
  const continuityEnvelope = createFluidContinuityEnvelope({
    fluidBodyId,
    continuityGroupId: options.continuity?.continuityGroupId,
    waveFieldId: options.continuity?.waveFieldId,
    strategy: options.continuity?.strategy,
    bands: options.continuity?.bands,
  });
  const profileSpec = profileRepresentationSpecs[profile][band];
  const continuity = continuityEnvelope.bands[band];
  const rtParticipation =
    supportsRayTracing || profileSpec.rtParticipation === "disabled"
      ? profileSpec.rtParticipation
      : band === "near"
        ? "selective"
        : band === "mid"
          ? "proxy"
          : "disabled";

  return Object.freeze({
    id: `${fluidBodyId}.${band}.${profileSpec.output}`,
    fluidBodyId,
    kind,
    profile,
    band,
    output: profileSpec.output,
    mesh: profileSpec.mesh,
    updateCadenceDivisor: profileSpec.updateCadenceDivisor,
    rtParticipation,
    shadowMode:
      rtParticipation === "disabled" && band === "near"
        ? "selective-raster"
        : profileSpec.shadowMode,
    shading: profileSpec.shading,
    material: createFluidMaterialDescriptor(
      fluidBodyId,
      band,
      profile,
      profileSpec.shading.caustics
    ),
    medium: createFluidMediumDescriptor(fluidBodyId, band, profile),
    continuity: Object.freeze({
      continuityGroupId: continuityEnvelope.continuityGroupId,
      waveFieldId: continuityEnvelope.waveFieldId,
      strategy: continuityEnvelope.strategy,
      inheritsFromBand: continuity.inheritsFromBand,
      blendWindowMeters: continuity.blendWindowMeters,
      amplitudeFloor: continuity.amplitudeFloor,
      frequencyFloor: continuity.frequencyFloor,
      retainFoamHistory: continuity.retainFoamHistory,
      retainLowFrequencyWaves: continuity.retainLowFrequencyWaves,
      retainDirectionality: continuity.retainDirectionality,
    }),
    performance: Object.freeze({
      ...profileSpec.performance,
      importanceSignals: Object.freeze({
        ...profileSpec.performance.importanceSignals,
        visible: band === "near" ? true : thresholds.nearMaxMeters > 0,
      }),
    }),
  });
}

/**
 * Selects the active fluid representation band for a given distance.
 */
export function selectFluidRepresentationBand(
  distanceMeters: number,
  thresholds: FluidRangeThresholds
): FluidRepresentationBand {
  const distance = assertFiniteNonNegativeNumber("distanceMeters", distanceMeters);

  if (distance <= thresholds.nearMaxMeters) {
    return "near";
  }
  if (distance <= thresholds.midMaxMeters) {
    return "mid";
  }
  if (distance <= thresholds.farMaxMeters) {
    return "far";
  }
  return "horizon";
}

/**
 * Creates a continuity-aware fluid representation plan spanning near, mid, far,
 * and horizon bands.
 */
export function createFluidRepresentationPlan(
  options: FluidRepresentationPlanOptions
): FluidRepresentationPlan {
  const fluidBodyId = assertIdentifier("fluidBodyId", options.fluidBodyId);
  const kind = options.kind
    ? normalizeFluidBodyKind(options.kind)
    : "ocean";
  const profile = options.profile
    ? normalizeFluidProfile(options.profile)
    : "interactive";
  const supportsRayTracing = options.supportsRayTracing ?? true;
  const thresholds = normalizeThresholds(
    options.nearFieldMaxMeters ?? 40,
    options.midFieldMaxMeters ?? 160,
    options.farFieldMaxMeters ?? 700
  );
  const continuity = createFluidContinuityEnvelope({
    fluidBodyId,
    continuityGroupId: options.continuity?.continuityGroupId,
    waveFieldId: options.continuity?.waveFieldId,
    strategy: options.continuity?.strategy,
    bands: options.continuity?.bands,
  });

  return Object.freeze({
    schemaVersion: 1,
    owner: "fluid",
    fluidBodyId,
    kind,
    profile,
    supportsRayTracing,
    thresholds,
    continuity,
    bands: fluidRepresentationBands,
    representations: Object.freeze(
      fluidRepresentationBands.map((band) =>
        buildRepresentationDescriptor(
          fluidBodyId,
          kind,
          profile,
          band,
          supportsRayTracing,
          thresholds,
          options
        )
      )
    ),
  });
}
