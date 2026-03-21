import { loadGltfModel } from "./gltf-loader.js";

const STYLE_ID = "plasius-package-local-harbor-demo";

const DEFAULT_SCENE_NOTES = Object.freeze([
  "The ships are loaded from a local GLTF asset and use the embedded physics metadata.",
  "This demo is self-contained inside the package so it can run from a package-local server root.",
  "Use the stress toggle to force more visible scene pressure and package-specific adaptation.",
]);

const UNIT_BOX_MESH = Object.freeze({
  positions: Object.freeze([
    -0.5, -0.5, -0.5,
    0.5, -0.5, -0.5,
    0.5, 0.5, -0.5,
    -0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5,
    0.5, -0.5, 0.5,
    0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,
  ]),
  indices: Object.freeze([
    0, 1, 2, 0, 2, 3,
    5, 4, 7, 5, 7, 6,
    4, 0, 3, 4, 3, 7,
    1, 5, 6, 1, 6, 2,
    3, 2, 6, 3, 6, 7,
    4, 5, 1, 4, 1, 0,
  ]),
});

const SHIP_RENDER_SCALE = 1.1;

function injectStyles() {
  if (globalThis.document?.getElementById(STYLE_ID)) {
    return;
  }

  const style = globalThis.document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      color-scheme: light;
      --plasius-paper: #f1f5f7;
      --plasius-ink: #152028;
      --plasius-muted: #5b6c77;
      --plasius-accent: #8f5634;
      --plasius-panel: rgba(255, 255, 255, 0.84);
      --plasius-border: rgba(21, 32, 40, 0.12);
      --plasius-shadow: 0 18px 44px rgba(15, 24, 31, 0.16);
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--plasius-ink);
      background:
        radial-gradient(circle at top left, rgba(255, 248, 239, 0.9), transparent 32%),
        linear-gradient(180deg, #edf3f6 0%, #cfdae2 46%, #b9c8d1 100%);
      font-family: "Fraunces", "Iowan Old Style", serif;
    }
    .plasius-demo {
      width: min(1520px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 40px;
      display: grid;
      gap: 20px;
    }
    .plasius-demo__hero,
    .plasius-demo__layout {
      display: grid;
      gap: 20px;
    }
    .plasius-demo__hero {
      grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.82fr);
      align-items: start;
    }
    .plasius-panel {
      border: 1px solid var(--plasius-border);
      border-radius: 24px;
      background: var(--plasius-panel);
      box-shadow: var(--plasius-shadow);
      backdrop-filter: blur(12px);
    }
    .plasius-demo__hero-card,
    .plasius-demo__status {
      padding: 20px 22px;
    }
    .plasius-demo__eyebrow {
      margin: 0 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 12px;
      color: rgba(21, 32, 40, 0.56);
    }
    .plasius-demo h1,
    .plasius-demo h2 {
      margin: 0;
    }
    .plasius-demo__lead {
      margin: 12px 0 0;
      color: var(--plasius-muted);
      line-height: 1.6;
      max-width: 740px;
    }
    .plasius-demo__status-badge {
      width: fit-content;
      margin: 0;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(143, 86, 52, 0.12);
      color: var(--plasius-accent);
      font-weight: 700;
    }
    .plasius-demo__status-text {
      margin: 10px 0 0;
      color: var(--plasius-muted);
      line-height: 1.6;
    }
    .plasius-demo__layout {
      grid-template-columns: minmax(0, 1.42fr) minmax(320px, 0.72fr);
      align-items: start;
    }
    .plasius-demo__canvas-panel {
      position: relative;
      padding: 18px;
    }
    .plasius-demo__canvas {
      width: 100%;
      aspect-ratio: 16 / 9;
      display: block;
      border-radius: 20px;
      border: 1px solid rgba(21, 32, 40, 0.08);
      background: linear-gradient(180deg, #dce7ef 0%, #aebfd0 42%, #0f5168 42%, #082431 100%);
    }
    .plasius-demo__toolbar {
      position: absolute;
      top: 26px;
      left: 26px;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .plasius-demo button,
    .plasius-demo label {
      font-family: "JetBrains Mono", monospace;
      font-size: 13px;
    }
    .plasius-demo button,
    .plasius-demo .plasius-toggle {
      border: 1px solid rgba(21, 32, 40, 0.12);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.84);
      color: var(--plasius-ink);
      padding: 10px 14px;
    }
    .plasius-toggle {
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }
    .plasius-demo__sidebar {
      display: grid;
      gap: 18px;
    }
    .plasius-demo__card {
      padding: 18px;
    }
    .plasius-demo__metrics,
    .plasius-demo__metrics li {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .plasius-demo__metrics {
      margin-top: 12px;
      display: grid;
      gap: 8px;
      color: var(--plasius-muted);
      line-height: 1.55;
    }
    .plasius-demo__metrics li {
      border-top: 1px solid rgba(21, 32, 40, 0.08);
      padding-top: 8px;
    }
    .plasius-demo__legend {
      position: absolute;
      right: 24px;
      bottom: 24px;
      padding: 10px 14px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.84);
      border: 1px solid rgba(21, 32, 40, 0.1);
      color: var(--plasius-muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .plasius-demo__legend strong {
      display: block;
      color: var(--plasius-ink);
      margin-bottom: 4px;
    }
    .plasius-demo__footer {
      margin-top: 4px;
      color: rgba(21, 32, 40, 0.66);
      font-size: 13px;
      line-height: 1.6;
    }
    @media (max-width: 1200px) {
      .plasius-demo__hero,
      .plasius-demo__layout {
        grid-template-columns: 1fr;
      }
    }
  `;
  globalThis.document.head.appendChild(style);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function vec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function addVec3(a, b) {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

function subVec3(a, b) {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

function scaleVec3(a, scalar) {
  return vec3(a.x * scalar, a.y * scalar, a.z * scalar);
}

function dotVec3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function crossVec3(a, b) {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
}

function lengthVec3(a) {
  return Math.hypot(a.x, a.y, a.z);
}

function normalizeVec3(a) {
  const length = lengthVec3(a) || 1;
  return vec3(a.x / length, a.y / length, a.z / length);
}

function normalizePlanarDirection(x, z) {
  return normalizeVec3(vec3(x, 0, z));
}

function getHeightFieldIndex(rows, cols, row, column) {
  const clampedRow = clamp(row, 0, rows - 1);
  const clampedColumn = clamp(column, 0, cols - 1);
  return clampedRow * cols + clampedColumn;
}

function getSmoothedHeightFieldPoint(positions, rows, cols, row, column) {
  const base = positions[getHeightFieldIndex(rows, cols, row, column)];
  let height = 0;
  let totalWeight = 0;

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      const weight =
        rowOffset === 0 && columnOffset === 0 ? 4 : rowOffset === 0 || columnOffset === 0 ? 2 : 1;
      const point =
        positions[getHeightFieldIndex(rows, cols, row + rowOffset, column + columnOffset)];
      height += point.y * weight;
      totalWeight += weight;
    }
  }

  return vec3(base.x, height / totalWeight, base.z);
}

export function buildHeightFieldNormals(positions, rows, cols) {
  const normals = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const left = getSmoothedHeightFieldPoint(positions, rows, cols, row, column - 1);
      const right = getSmoothedHeightFieldPoint(positions, rows, cols, row, column + 1);
      const up = getSmoothedHeightFieldPoint(positions, rows, cols, row - 1, column);
      const down = getSmoothedHeightFieldPoint(positions, rows, cols, row + 1, column);
      const upLeft = getSmoothedHeightFieldPoint(positions, rows, cols, row - 1, column - 1);
      const upRight = getSmoothedHeightFieldPoint(positions, rows, cols, row - 1, column + 1);
      const downLeft = getSmoothedHeightFieldPoint(positions, rows, cols, row + 1, column - 1);
      const downRight = getSmoothedHeightFieldPoint(positions, rows, cols, row + 1, column + 1);

      const tangentX = subVec3(right, left);
      const tangentZ = subVec3(down, up);
      const diagonalA = subVec3(downRight, upLeft);
      const diagonalB = subVec3(downLeft, upRight);
      const primaryNormal = normalizeVec3(crossVec3(tangentZ, tangentX));
      const diagonalNormal = normalizeVec3(crossVec3(diagonalB, diagonalA));
      const seededNormal = normalizeVec3(
        addVec3(
          addVec3(scaleVec3(primaryNormal, 0.74), scaleVec3(diagonalNormal, 0.18)),
          vec3(0, 0.24, 0)
        )
      );

      normals.push(seededNormal);
    }
  }

  return normals.map((_, index) => {
    const row = Math.floor(index / cols);
    const column = index % cols;
    let smoothed = vec3(0, 0, 0);
    let totalWeight = 0;

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        const weight =
          rowOffset === 0 && columnOffset === 0 ? 4 : rowOffset === 0 || columnOffset === 0 ? 2 : 1;
        const normal =
          normals[getHeightFieldIndex(rows, cols, row + rowOffset, column + columnOffset)];
        smoothed = addVec3(smoothed, scaleVec3(normal, weight));
        totalWeight += weight;
      }
    }

    return normalizeVec3(addVec3(scaleVec3(smoothed, 1 / totalWeight), vec3(0, 0.12, 0)));
  });
}

function reflectVec3(vector, normal) {
  const unitNormal = normalizeVec3(normal);
  return subVec3(vector, scaleVec3(unitNormal, 2 * dotVec3(vector, unitNormal)));
}

function rotateY(point, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return vec3(
    point.x * cosine - point.z * sine,
    point.y,
    point.x * sine + point.z * cosine
  );
}

function transformPoint(point, transform) {
  const scale =
    typeof transform.scale === "number"
      ? { x: transform.scale, y: transform.scale, z: transform.scale }
      : transform.scale;
  const scaled = vec3(point.x * scale.x, point.y * scale.y, point.z * scale.z);
  const rotated = rotateY(scaled, transform.rotationY);
  return addVec3(rotated, transform.position);
}

export function reflectPointAcrossPlane(point, planeY, sink = 0.08) {
  return vec3(point.x, planeY - (point.y - planeY) - sink, point.z);
}

export function computeShipFloatOffset(bounds, physics = {}, scale = SHIP_RENDER_SCALE) {
  const minY = bounds?.min?.[1] ?? -0.5;
  const maxY = bounds?.max?.[1] ?? 0.95;
  const hullHeight = Math.max(0.1, (maxY - minY) * scale);
  const draftRatio = clamp(physics.draftRatio ?? 0.18, 0.08, 0.35);
  const surfaceClearance = physics.surfaceClearance ?? 0.09;
  const draftDepth = hullHeight * draftRatio;

  return -minY * scale - draftDepth + surfaceClearance;
}

function projectPoint(point, camera, viewport) {
  const relative = subVec3(point, camera.eye);
  const viewX = dotVec3(relative, camera.right);
  const viewY = dotVec3(relative, camera.up);
  const viewZ = dotVec3(relative, camera.forward);
  if (viewZ <= 0.1) {
    return null;
  }
  const focal = 1 / Math.tan((camera.fov * Math.PI) / 360);
  const ndcX = (viewX * focal) / (viewZ * camera.aspect);
  const ndcY = (viewY * focal) / viewZ;
  return {
    x: (ndcX * 0.5 + 0.5) * viewport.width,
    y: (-ndcY * 0.5 + 0.5) * viewport.height,
    depth: viewZ,
  };
}

function colorToRgba(color, alpha = 1) {
  const r = Math.round(clamp(color.r, 0, 1) * 255);
  const g = Math.round(clamp(color.g, 0, 1) * 255);
  const b = Math.round(clamp(color.b, 0, 1) * 255);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function projectShadowPoint(point, lightDir, planeY) {
  const shadowDir = scaleVec3(lightDir, -1);
  if (Math.abs(shadowDir.y) < 0.0001) {
    return null;
  }

  const distance = (planeY - point.y) / shadowDir.y;
  if (!Number.isFinite(distance) || distance < 0) {
    return null;
  }

  return addVec3(point, scaleVec3(shadowDir, distance));
}

function shadeColor(base, normal, lightDir, heightBias = 0, accent = 0) {
  const diffuse = clamp(dotVec3(normalizeVec3(normal), lightDir), 0, 1);
  const brightness = 0.24 + diffuse * 0.72 + heightBias * 0.08 + accent;
  return {
    r: clamp(base.r * brightness, 0, 1),
    g: clamp(base.g * brightness, 0, 1),
    b: clamp(base.b * (brightness + 0.03), 0, 1),
  };
}

function buildCamera(canvas) {
  const eye = vec3(17.5, 10.4, 22);
  const target = vec3(0, 2.2, 6.6);
  const forward = normalizeVec3(subVec3(target, eye));
  const right = normalizeVec3(crossVec3(forward, vec3(0, 1, 0)));
  const up = normalizeVec3(crossVec3(right, forward));
  return {
    eye,
    target,
    forward,
    right,
    up,
    fov: 54,
    aspect: canvas.width / canvas.height,
  };
}

function buildTrianglesFromMesh(mesh, transform, baseColor, camera, viewport, triangles, accent = 0) {
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const aIndex = mesh.indices[index] * 3;
    const bIndex = mesh.indices[index + 1] * 3;
    const cIndex = mesh.indices[index + 2] * 3;

    const a = transformPoint(
      vec3(mesh.positions[aIndex], mesh.positions[aIndex + 1], mesh.positions[aIndex + 2]),
      transform
    );
    const b = transformPoint(
      vec3(mesh.positions[bIndex], mesh.positions[bIndex + 1], mesh.positions[bIndex + 2]),
      transform
    );
    const c = transformPoint(
      vec3(mesh.positions[cIndex], mesh.positions[cIndex + 1], mesh.positions[cIndex + 2]),
      transform
    );

    const normal = normalizeVec3(crossVec3(subVec3(b, a), subVec3(c, a)));
    const viewDir = normalizeVec3(subVec3(camera.eye, a));
    if (dotVec3(normal, viewDir) <= 0) {
      continue;
    }

    const projected = [
      projectPoint(a, camera, viewport),
      projectPoint(b, camera, viewport),
      projectPoint(c, camera, viewport),
    ];
    if (projected.some((value) => value === null)) {
      continue;
    }

    triangles.push({
      points: projected,
      depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
      worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
      normal,
      baseColor,
      accent,
    });
  }
}

function sampleReflectionPlaneY(state, visuals, x, z, options = {}) {
  const planeVisuals = {
    ...visuals,
    waveAmplitude: (visuals.waveAmplitude ?? 1) * 0.72,
  };
  return (
    sampleFluidSurfaceHeight(state, planeVisuals, x, z, options) * 0.65 -
    0.03
  );
}

function applyReflectionDistortion(projectedPoint, sourcePoint, state, waveSettings, strength) {
  const ripple = sampleDirectionalWaveField(
    sourcePoint.x,
    sourcePoint.z,
    state.time,
    1,
    waveSettings
  );
  const wake = sampleFluidWakeField(
    state,
    sourcePoint.x,
    sourcePoint.z,
    state.time,
    waveSettings
  );
  const collision = sampleFluidCollisionField(
    state,
    sourcePoint.x,
    sourcePoint.z,
    waveSettings
  );
  const distortion = ripple * 0.7 + wake * 1.4 + collision * 1.2;

  return {
    ...projectedPoint,
    x:
      projectedPoint.x +
      waveSettings.primaryDirection.x * distortion * (18 + strength * 30),
    y: projectedPoint.y + distortion * (11 + strength * 18),
  };
}

function buildReflectionTrianglesFromWorldPoints(
  worldPoints,
  baseColor,
  state,
  visuals,
  camera,
  viewport,
  triangles,
  options = {}
) {
  const waveSettings = options.waveSettings ?? createWaveFieldSettings(visuals);
  const reflectionStrength = clamp(options.reflectionStrength ?? 0.2, 0, 0.55);
  const worldCenter = scaleVec3(
    worldPoints.reduce((acc, point) => addVec3(acc, point), vec3(0, 0, 0)),
    1 / worldPoints.length
  );
  const planeY = sampleReflectionPlaneY(state, visuals, worldCenter.x, worldCenter.z, {
    settings: waveSettings,
  });
  const reflected = worldPoints.map((point) =>
    reflectPointAcrossPlane(point, planeY, 0.08 + reflectionStrength * 0.1)
  );
  const projected = reflected
    .map((point) => projectPoint(point, camera, viewport))
    .map((point, index) =>
      point
        ? applyReflectionDistortion(point, reflected[index], state, waveSettings, reflectionStrength)
        : null
    );
  if (projected.some((value) => value === null)) {
    return;
  }

  const averageY =
    projected.reduce((sum, point) => sum + point.y, 0) / projected.length;
  if (averageY < viewport.height * 0.42) {
    return;
  }

  const reflectedNormal = normalizeVec3(
    crossVec3(subVec3(reflected[2], reflected[0]), subVec3(reflected[1], reflected[0]))
  );
  triangles.push({
    points: projected,
    depth: projected.reduce((sum, point) => sum + point.depth, 0) / projected.length,
    worldCenter: scaleVec3(
      reflected.reduce((acc, point) => addVec3(acc, point), vec3(0, 0, 0)),
      1 / reflected.length
    ),
    normal: reflectedNormal,
    baseColor,
    accent: 0,
    alpha: 0.14 + reflectionStrength * 0.22,
    isReflection: true,
    horizonFade: clamp((averageY - viewport.height * 0.43) / (viewport.height * 0.46), 0, 1),
  });
}

function buildReflectionTrianglesFromMesh(
  mesh,
  transform,
  baseColor,
  state,
  visuals,
  camera,
  viewport,
  triangles,
  options = {}
) {
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const aIndex = mesh.indices[index] * 3;
    const bIndex = mesh.indices[index + 1] * 3;
    const cIndex = mesh.indices[index + 2] * 3;
    const worldPoints = [
      transformPoint(
        vec3(mesh.positions[aIndex], mesh.positions[aIndex + 1], mesh.positions[aIndex + 2]),
        transform
      ),
      transformPoint(
        vec3(mesh.positions[bIndex], mesh.positions[bIndex + 1], mesh.positions[bIndex + 2]),
        transform
      ),
      transformPoint(
        vec3(mesh.positions[cIndex], mesh.positions[cIndex + 1], mesh.positions[cIndex + 2]),
        transform
      ),
    ];

    buildReflectionTrianglesFromWorldPoints(
      worldPoints,
      baseColor,
      state,
      visuals,
      camera,
      viewport,
      triangles,
      options
    );
  }
}

function buildDemoDom(root, options) {
  root.innerHTML = `
    <main class="plasius-demo">
      <section class="plasius-demo__hero">
        <section class="plasius-panel plasius-demo__hero-card">
          <p class="plasius-demo__eyebrow">${options.packageName}</p>
          <h1>${options.title}</h1>
          <p class="plasius-demo__lead">${options.subtitle}</p>
        </section>
        <section class="plasius-panel plasius-demo__status">
          <p id="demoStatus" class="plasius-demo__status-badge">Booting package-local 3D scene…</p>
          <p id="demoDetails" class="plasius-demo__status-text">
            Loading the GLTF ships, establishing harbor motion, and preparing package-specific overlays.
          </p>
        </section>
      </section>
      <section class="plasius-demo__layout">
        <section class="plasius-panel plasius-demo__canvas-panel">
          <canvas id="demoCanvas" class="plasius-demo__canvas" width="1280" height="720"></canvas>
          <div class="plasius-demo__toolbar">
            <button id="pauseButton" type="button">Pause</button>
            <label class="plasius-toggle">
              <input id="stressToggle" type="checkbox" />
              Stress mode
            </label>
          </div>
          <div class="plasius-demo__legend">
            <strong>Scene</strong>
            Local GLTF ships with collision metadata.<br />
            Harbor waves, a cloth flag, and package overlays.<br />
            Ray-traced shadow and reflection style is preserved near the camera.
          </div>
        </section>
        <aside class="plasius-demo__sidebar">
          <section class="plasius-panel plasius-demo__card">
            <h2>Scene State</h2>
            <ul id="sceneMetrics" class="plasius-demo__metrics"></ul>
          </section>
          <section class="plasius-panel plasius-demo__card">
            <h2>Package State</h2>
            <ul id="qualityMetrics" class="plasius-demo__metrics"></ul>
          </section>
          <section class="plasius-panel plasius-demo__card">
            <h2>Diagnostics</h2>
            <ul id="debugMetrics" class="plasius-demo__metrics"></ul>
          </section>
          <section class="plasius-panel plasius-demo__card">
            <h2>Notes</h2>
            <ul id="sceneNotes" class="plasius-demo__metrics"></ul>
          </section>
        </aside>
      </section>
      <p class="plasius-demo__footer">
        This demo is intentionally self-contained so package-local validation behaves the same as workspace-root validation.
      </p>
    </main>
  `;

  return {
    status: root.querySelector("#demoStatus"),
    details: root.querySelector("#demoDetails"),
    canvas: root.querySelector("#demoCanvas"),
    pauseButton: root.querySelector("#pauseButton"),
    stressToggle: root.querySelector("#stressToggle"),
    sceneMetrics: root.querySelector("#sceneMetrics"),
    qualityMetrics: root.querySelector("#qualityMetrics"),
    debugMetrics: root.querySelector("#debugMetrics"),
    sceneNotes: root.querySelector("#sceneNotes"),
  };
}

function setListContent(element, values) {
  element.innerHTML = values.map((value) => `<li>${value}</li>`).join("");
}

export function createWaveFieldSettings(visuals = {}) {
  const primaryDirection = normalizePlanarDirection(
    visuals.waveDirection?.x ?? 0.94,
    visuals.waveDirection?.z ?? 0.34
  );
  const lateralDirection = normalizePlanarDirection(
    -primaryDirection.z,
    primaryDirection.x
  );
  const phaseSpeed = visuals.wavePhaseSpeed ?? 1.16;

  return Object.freeze({
    primaryDirection,
    lateralDirection,
    phaseSpeed,
    driftMetersPerSecond: visuals.waveDriftMetersPerSecond ?? phaseSpeed * 6.2,
    wakeStrength: visuals.wakeStrength ?? 0.28,
    wakeLength: visuals.wakeLength ?? 18,
    wakeWidth: visuals.wakeWidth ?? 2.6,
    wakeFrequency: visuals.wakeFrequency ?? 1.72,
    hullInfluence: visuals.hullInfluence ?? 0.08,
    collisionRippleStrength: visuals.collisionRippleStrength ?? 0.52,
    collisionRippleSpeed: visuals.collisionRippleSpeed ?? 4.6,
    collisionRippleWidth: visuals.collisionRippleWidth ?? 3.8,
    collisionRippleFrequency: visuals.collisionRippleFrequency ?? 1.48,
    collisionRippleDecay: visuals.collisionRippleDecay ?? 0.6,
  });
}

export function sampleDirectionalWaveField(
  x,
  z,
  time,
  waveAmplitude,
  settings = createWaveFieldSettings()
) {
  const point = vec3(x, 0, z);
  const along = dotVec3(point, settings.primaryDirection);
  const across = dotVec3(point, settings.lateralDirection);
  const phase = settings.phaseSpeed;

  return (
    Math.sin(
      along * 0.22 -
        time * phase * 1.34 +
        Math.sin(across * 0.04 - time * phase * 0.18) * 0.42
    ) *
      waveAmplitude *
      0.46 +
    Math.sin(
      along * 0.12 +
        across * 0.035 -
        time * phase * 0.82 +
        0.8
    ) *
      waveAmplitude *
      0.3 +
    Math.sin(
      along * 0.36 -
        across * 0.08 -
        time * phase * 1.78 +
        1.9
    ) *
      waveAmplitude *
      0.16 +
    Math.sin(
      across * 0.06 +
        along * 0.02 -
        time * phase * 0.38
    ) *
      waveAmplitude *
      0.08
  );
}

export function createFluidWaveImpulse(
  origin,
  strength,
  options = {}
) {
  return Object.freeze({
    origin: vec3(origin.x, origin.y ?? 0, origin.z),
    age: options.age ?? 0,
    strength,
    radiusGrowth: options.radiusGrowth ?? 4.6,
    bandWidth: options.bandWidth ?? 3.8,
    frequency: options.frequency ?? 1.48,
    decayRate: options.decayRate ?? 0.6,
  });
}

export function sampleFluidWakeField(
  state,
  x,
  z,
  time,
  settings = createWaveFieldSettings(),
  options = {}
) {
  const excludeShipId = options.excludeShipId;
  let wake = 0;

  for (const ship of state.ships ?? []) {
    if (ship.id === excludeShipId) {
      continue;
    }

    const speed = Math.hypot(ship.velocity.x, ship.velocity.z);
    if (speed < 0.12) {
      continue;
    }

    const heading = normalizePlanarDirection(ship.velocity.x, ship.velocity.z);
    const trailing = scaleVec3(heading, -1);
    const lateral = normalizePlanarDirection(-heading.z, heading.x);
    const stern = addVec3(ship.position, scaleVec3(heading, -2.8));
    const rel = vec3(x - stern.x, 0, z - stern.z);
    const trail = dotVec3(rel, trailing);
    if (trail < 0 || trail > settings.wakeLength) {
      continue;
    }

    const side = dotVec3(rel, lateral);
    const width = mix(
      settings.wakeWidth * 0.7,
      settings.wakeWidth * 1.8,
      clamp(trail / settings.wakeLength, 0, 1)
    );
    const envelope =
      Math.exp(-trail / (settings.wakeLength * 0.8)) *
      Math.exp(-(side * side) / (width * width));
    const phase =
      trail * settings.wakeFrequency -
      time * (settings.phaseSpeed * 2 + speed * 0.28);

    wake +=
      Math.sin(phase) *
      envelope *
      Math.min(1.5, speed * 0.22) *
      settings.wakeStrength;

    const bow = addVec3(ship.position, scaleVec3(heading, 2.4));
    const bowRel = vec3(x - bow.x, 0, z - bow.z);
    const bowForward = dotVec3(bowRel, heading);
    const bowSide = dotVec3(bowRel, lateral);
    if (bowForward > -1.2 && bowForward < 3.2) {
      const bowEnvelope =
        Math.exp(-(bowForward * bowForward) / 7.2) *
        Math.exp(-(bowSide * bowSide) / 3.8);
      wake += bowEnvelope * settings.hullInfluence * Math.min(1.3, speed * 0.16);
    }
  }

  return wake;
}

export function sampleFluidCollisionField(
  state,
  x,
  z,
  settings = createWaveFieldSettings()
) {
  let ripples = 0;

  for (const impulse of state.waveImpulses ?? []) {
    const dx = x - impulse.origin.x;
    const dz = z - impulse.origin.z;
    const distance = Math.hypot(dx, dz);
    const radius = impulse.age * impulse.radiusGrowth;
    const front = distance - radius;
    if (Math.abs(front) > impulse.bandWidth) {
      continue;
    }

    const envelope =
      Math.exp(-(front * front) / (impulse.bandWidth * impulse.bandWidth * 0.82)) *
      Math.exp(-impulse.age * impulse.decayRate);
    ripples +=
      Math.sin(front * impulse.frequency - impulse.age * settings.collisionRippleSpeed) *
      impulse.strength *
      envelope;
  }

  return ripples;
}

export function sampleFluidSurfaceHeight(
  state,
  visuals,
  x,
  z,
  options = {}
) {
  const settings =
    options.settings ?? createWaveFieldSettings(visuals);
  const waveAmplitude = options.waveAmplitude ?? visuals.waveAmplitude ?? 1;

  return (
    sampleDirectionalWaveField(x, z, state.time, waveAmplitude, settings) +
    sampleFluidWakeField(state, x, z, state.time, settings, options) +
    sampleFluidCollisionField(state, x, z, settings)
  );
}

function updateFluidImpulses(state, dt) {
  state.waveImpulses = (state.waveImpulses ?? [])
    .map((impulse) => ({
      ...impulse,
      age: impulse.age + dt,
    }))
    .filter((impulse) => impulse.age < 7.5);
}

function spawnSpray(state, point, intensity) {
  const count = clamp(Math.round(8 + intensity * 3), 8, 20);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const speed = 0.9 + Math.random() * intensity * 0.4;
    state.sprays.push({
      position: vec3(point.x, point.y, point.z),
      velocity: vec3(
        Math.cos(angle) * speed * 0.35,
        1.05 + Math.random() * 0.8,
        Math.sin(angle) * speed * 0.24
      ),
      life: 1.15 + Math.random() * 0.35,
    });
  }
}

function updateShips(state, dt, shipModel, visuals) {
  const physics = shipModel.physics;
  const halfExtents = physics.halfExtents ?? [1.35, 0.95, 3.9];
  const waveSettings = createWaveFieldSettings(visuals);
  const floatOffset = computeShipFloatOffset(shipModel.bounds, physics, SHIP_RENDER_SCALE);
  let collided = false;
  for (const ship of state.ships) {
    ship.position = addVec3(ship.position, scaleVec3(ship.velocity, dt));
    ship.rotationY += ship.angularVelocity * dt;
    ship.velocity = scaleVec3(ship.velocity, 1 - (physics.linearDamping ?? 0.04) * dt);
    ship.angularVelocity *= 1 - (physics.angularDamping ?? 0.08) * dt;
    const surfaceY =
      sampleFluidSurfaceHeight(state, visuals, ship.position.x, ship.position.z, {
        settings: waveSettings,
        excludeShipId: ship.id,
      }) *
      0.65;
    const targetFloatY = surfaceY + floatOffset;
    ship.position.y = mix(
      ship.position.y,
      targetFloatY,
      clamp(dt * 4.8, 0.18, 0.32)
    );
    if (Math.abs(ship.position.x) > 10) {
      ship.velocity.x *= -1;
      ship.angularVelocity *= -1;
    }
    if (ship.position.z < 2 || ship.position.z > 16) {
      ship.velocity.z *= -1;
      ship.angularVelocity *= -1;
    }
  }

  const [a, b] = state.ships;
  const dx = b.position.x - a.position.x;
  const dz = b.position.z - a.position.z;
  const overlapX = Math.abs(dx) < halfExtents[0] * 1.7;
  const overlapZ = Math.abs(dz) < halfExtents[2] * 0.8;
  if (overlapX && overlapZ) {
    const restitution = physics.restitution ?? 0.22;
    const swapX = a.velocity.x;
    const swapZ = a.velocity.z;
    a.velocity.x = -b.velocity.x * (0.86 + restitution);
    a.velocity.z = -b.velocity.z * (0.82 + restitution);
    b.velocity.x = -swapX * (0.86 + restitution);
    b.velocity.z = -swapZ * (0.82 + restitution);
    a.angularVelocity += 0.55;
    b.angularVelocity -= 0.55;
    const contact = vec3(
      (a.position.x + b.position.x) * 0.5,
      (a.position.y + b.position.y) * 0.5 + 0.1,
      (a.position.z + b.position.z) * 0.5
    );
    spawnSpray(state, contact, Math.abs(dx) + Math.abs(dz));
    state.waveImpulses.push(
      createFluidWaveImpulse(
        contact,
        clamp(
          waveSettings.collisionRippleStrength *
            (0.48 + (Math.abs(dx) + Math.abs(dz)) * 0.12),
          0.18,
          waveSettings.collisionRippleStrength
        ),
        {
          radiusGrowth: waveSettings.collisionRippleSpeed,
          bandWidth: waveSettings.collisionRippleWidth,
          frequency: waveSettings.collisionRippleFrequency,
          decayRate: waveSettings.collisionRippleDecay,
        }
      )
    );
    state.collisions += 1;
    collided = true;
  }
  state.collisionFlash = collided ? 1 : Math.max(0, state.collisionFlash - dt * 1.8);
}

function updateSprays(state, dt) {
  state.sprays = state.sprays
    .map((particle) => {
      const nextVelocity = vec3(
        particle.velocity.x,
        particle.velocity.y - 4.2 * dt,
        particle.velocity.z
      );
      return {
        position: addVec3(particle.position, scaleVec3(nextVelocity, dt)),
        velocity: nextVelocity,
        life: particle.life - dt,
      };
    })
    .filter((particle) => particle.life > 0 && particle.position.y > -0.2);
}

function createState(packageState) {
  return {
    time: 0,
    frame: 0,
    paused: false,
    stress: false,
    lastTimeMs: null,
    packageState,
    collisions: 0,
    collisionFlash: 0,
    sprays: [],
    waveImpulses: [],
    ships: [
      {
        id: "northwind",
        position: vec3(-5.4, 0, 7.2),
        velocity: vec3(2.1, 0, -1.62),
        rotationY: 0.42,
        angularVelocity: 0.18,
        tint: { r: 0.62, g: 0.39, b: 0.23 },
      },
      {
        id: "tidecaller",
        position: vec3(4.9, 0, 4.5),
        velocity: vec3(-1.86, 0, 1.24),
        rotationY: -2.62,
        angularVelocity: -0.14,
        tint: { r: 0.48, g: 0.28, b: 0.19 },
      },
    ],
  };
}

function drawSkyAndSea(ctx, canvas, state, visuals, shadowStrength, reflectionStrength) {
  const premiumShadows = shadowStrength > 0.34;
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
  sky.addColorStop(0, visuals.skyTop ?? (premiumShadows ? "#f0f7fb" : "#e8f1f7"));
  sky.addColorStop(0.58, visuals.skyMid ?? (premiumShadows ? "#c2d6e2" : "#b7cfdf"));
  sky.addColorStop(1, visuals.skyBottom ?? (premiumShadows ? "#81a6bb" : "#7ba2b7"));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sea = ctx.createLinearGradient(0, canvas.height * 0.46, 0, canvas.height);
  sea.addColorStop(0, visuals.seaTop ?? (premiumShadows ? "#215167" : "#245167"));
  sea.addColorStop(0.55, visuals.seaMid ?? "#123d52");
  sea.addColorStop(1, visuals.seaBottom ?? "#082331");
  ctx.fillStyle = sea;
  ctx.fillRect(0, canvas.height * 0.46, canvas.width, canvas.height * 0.54);

  const sunX = mix(canvas.width * 0.16, canvas.width * 0.82, (Math.sin(state.time * 0.12) + 1) * 0.5);
  const sunY = canvas.height * 0.14 + Math.cos(state.time * 0.12) * 22;
  const sun = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 94);
  sun.addColorStop(0, visuals.sunCore ?? "rgba(255, 244, 210, 0.9)");
  sun.addColorStop(1, "rgba(255, 244, 210, 0)");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 94, 0, Math.PI * 2);
  ctx.fill();

  const track = ctx.createLinearGradient(sunX, canvas.height * 0.46, sunX, canvas.height * 0.98);
  track.addColorStop(0, `rgba(255, 243, 214, ${0.08 + reflectionStrength * 0.18})`);
  track.addColorStop(0.38, `rgba(224, 242, 255, ${0.04 + reflectionStrength * 0.18})`);
  track.addColorStop(1, "rgba(224, 242, 255, 0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = track;
  ctx.beginPath();
  ctx.ellipse(sunX, canvas.height * 0.73, 44 + shadowStrength * 58, canvas.height * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (state.collisionFlash > 0) {
    ctx.fillStyle = `rgba(255, 241, 224, ${state.collisionFlash * 0.16})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawTriangles(ctx, triangles, lightDir, reflectionStrength, camera, shadowStrength) {
  triangles.sort((left, right) => right.depth - left.depth);
  for (const triangle of triangles) {
    const surfaceNormal = normalizeVec3(triangle.normal);
    const shaded = shadeColor(
      triangle.baseColor,
      surfaceNormal,
      lightDir,
      clamp((triangle.worldCenter.y + 3) / 10, 0, 1),
      triangle.accent
    );
    const reflection = triangle.worldCenter.y < 0.8 ? reflectionStrength : 0;
    const viewDir = normalizeVec3(subVec3(camera.eye, triangle.worldCenter));
    const reflectedLight = reflectVec3(scaleVec3(lightDir, -1), surfaceNormal);
    const gloss = triangle.worldCenter.y < 0.9 ? 1 : triangle.accent > 0.05 ? 0.55 : 0.3;
    const specular = Math.pow(clamp(dotVec3(reflectedLight, viewDir), 0, 1), triangle.worldCenter.y < 0.9 ? 18 : 12) * gloss;
    const occlusion = triangle.worldCenter.y < 0.9 ? shadowStrength * 0.03 : 0;
    const fillColor = triangle.isReflection
      ? {
          r: clamp(shaded.r * (0.58 + reflectionStrength * 0.24), 0, 1),
          g: clamp(shaded.g * (0.64 + reflectionStrength * 0.26), 0, 1),
          b: clamp(shaded.b * (0.78 + reflectionStrength * 0.32) + reflectionStrength * 0.06, 0, 1),
        }
      : {
          r: clamp(shaded.r + reflection * 0.08 + specular * 0.14 - occlusion, 0, 1),
          g: clamp(shaded.g + reflection * 0.08 + specular * 0.15 - occlusion, 0, 1),
          b: clamp(shaded.b + reflection * 0.14 + specular * 0.2 - occlusion * 0.5, 0, 1),
        };
    const alpha = triangle.isReflection
      ? clamp((triangle.alpha ?? 0.18) * (triangle.horizonFade ?? 1), 0, 0.54)
      : triangle.alpha ?? 0.98;
    ctx.fillStyle = colorToRgba(
      fillColor,
      alpha
    );
    ctx.beginPath();
    ctx.moveTo(triangle.points[0].x, triangle.points[0].y);
    ctx.lineTo(triangle.points[1].x, triangle.points[1].y);
    ctx.lineTo(triangle.points[2].x, triangle.points[2].y);
    ctx.closePath();
    ctx.fill();
  }
}

function renderProjectedShadow(ctx, worldPoints, camera, viewport, lightDir, options = {}) {
  const planeY = options.planeY ?? 0;
  const projected = worldPoints
    .map((point) => projectShadowPoint(point, lightDir, planeY))
    .filter(Boolean)
    .map((point) => projectPoint(point, camera, viewport))
    .filter(Boolean);

  if (projected.length < 3) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = options.color ?? `rgba(12, 24, 36, ${clamp(options.alpha ?? 0.14, 0, 0.5)})`;
  ctx.shadowColor = options.color ?? "rgba(12, 24, 36, 0.22)";
  ctx.shadowBlur = options.blur ?? 18;
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let index = 1; index < projected.length; index += 1) {
    ctx.lineTo(projected[index].x, projected[index].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getHarborObjects(visuals) {
  return [
    {
      position: vec3(-8.2, 1.1, -0.9),
      rotationY: -0.16,
      scale: { x: 5.4, y: 2.4, z: 4.2 },
      color: visuals.harborWall ?? { r: 0.48, g: 0.4, b: 0.32 },
      accent: 0.06,
    },
    {
      position: vec3(-5.8, 0.45, 1.5),
      rotationY: -0.08,
      scale: { x: 6.8, y: 0.3, z: 2.1 },
      color: visuals.harborDeck ?? { r: 0.5, g: 0.34, b: 0.22 },
      accent: 0.04,
    },
    {
      position: vec3(-10.3, 0.28, 0.8),
      rotationY: 0.22,
      scale: { x: 1.2, y: 0.9, z: 1.2 },
      color: visuals.harborTower ?? { r: 0.34, g: 0.32, b: 0.36 },
      accent: 0.02,
    },
  ];
}

function pushHarborGeometry(camera, viewport, triangles, visuals) {
  const harborObjects = getHarborObjects(visuals);

  for (const object of harborObjects) {
    buildTrianglesFromMesh(
      UNIT_BOX_MESH,
      {
        position: object.position,
        rotationY: object.rotationY,
        scale: object.scale,
      },
      object.color,
      camera,
      viewport,
      triangles,
      object.accent
    );
  }
}

function pushHarborReflections(state, visuals, camera, viewport, triangles, reflectionStrength) {
  for (const object of getHarborObjects(visuals)) {
    buildReflectionTrianglesFromMesh(
      UNIT_BOX_MESH,
      {
        position: object.position,
        rotationY: object.rotationY,
        scale: object.scale,
      },
      object.color,
      state,
      visuals,
      camera,
      viewport,
      triangles,
      {
        reflectionStrength: reflectionStrength * 0.9,
      }
    );
  }
}

function buildWaterSurface(state, visuals) {
  const waveSettings = createWaveFieldSettings(visuals);
  const width = 42;
  const depth = 38;
  const cols = state.stress ? 46 : 36;
  const rows = state.stress ? 30 : 24;
  const positions = [];
  const indices = [];
  const originX = -width * 0.5;
  const originZ = -4;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const u = column / (cols - 1);
      const v = row / (rows - 1);
      const x = originX + width * u;
      const z = originZ + depth * v;
      const y =
        sampleFluidSurfaceHeight(state, visuals, x, z, {
          settings: waveSettings,
        }) * 0.65;
      positions.push(vec3(x, y, z));
    }
  }
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < cols - 1; column += 1) {
      const a = row * cols + column;
      const b = a + 1;
      const c = a + cols + 1;
      const d = a + cols;
      indices.push(a, b, c, a, c, d);
    }
  }
  return {
    rows,
    cols,
    positions,
    normals: buildHeightFieldNormals(positions, rows, cols),
    indices,
    waveSettings,
    nearColor: visuals.waterNear ?? { r: 0.14, g: 0.39, b: 0.49 },
    farColor: visuals.waterFar ?? { r: 0.26, g: 0.52, b: 0.62 },
  };
}

function buildFlagSurface(state, visuals) {
  const cols = state.stress ? 18 : 14;
  const rows = state.stress ? 12 : 9;
  const positions = [];
  const indices = [];
  const origin = vec3(-3.5, 5.9, 2.4);
  const width = 4.8;
  const height = 2.7;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const u = column / (cols - 1);
      const v = row / (rows - 1);
      const gust = Math.sin(state.time * 1.9 + v * 3.2 + u * 2.1) * visuals.flagMotion * 0.7;
      const wrinkle = Math.sin(state.time * 4.4 + u * 9.2 + v * 5.6) * visuals.flagMotion * 0.18;
      positions.push(
        vec3(
          origin.x + u * 1.8 + gust * (u * 0.9),
          origin.y - height * v + wrinkle * 0.18,
          origin.z + width * u + gust * 0.9 * (u * 0.85)
        )
      );
    }
  }
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < cols - 1; column += 1) {
      const a = row * cols + column;
      const b = a + 1;
      const c = a + cols + 1;
      const d = a + cols;
      indices.push(a, b, c, a, c, d);
    }
  }
  return {
    rows,
    cols,
    positions,
    indices,
    color: visuals.flagColor ?? { r: 0.76, g: 0.24, b: 0.18 },
  };
}

function renderShipRigging(ctx, ship, camera, viewport) {
  const transform = { position: ship.position, rotationY: ship.rotationY, scale: SHIP_RENDER_SCALE };
  const mastBase = transformPoint(vec3(0, 0.38, -0.4), transform);
  const mastTop = transformPoint(vec3(0, 3.8, -0.2), transform);
  const aftBase = transformPoint(vec3(-0.25, 0.32, -1.9), transform);
  const aftTop = transformPoint(vec3(-0.15, 2.7, -1.75), transform);
  const sailA = transformPoint(vec3(0.08, 3.2, -0.2), transform);
  const sailB = transformPoint(vec3(0.12, 1.2, -0.5), transform);
  const sailC = transformPoint(vec3(2.25, 2.25, 0.15), transform);
  const projected = [mastBase, mastTop, aftBase, aftTop, sailA, sailB, sailC].map((point) =>
    projectPoint(point, camera, viewport)
  );
  if (projected.some((value) => value === null)) {
    return;
  }

  ctx.strokeStyle = "rgba(73, 54, 45, 0.94)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  ctx.lineTo(projected[1].x, projected[1].y);
  ctx.moveTo(projected[2].x, projected[2].y);
  ctx.lineTo(projected[3].x, projected[3].y);
  ctx.stroke();

  ctx.fillStyle = "rgba(238, 232, 214, 0.88)";
  ctx.beginPath();
  ctx.moveTo(projected[4].x, projected[4].y);
  ctx.lineTo(projected[5].x, projected[5].y);
  ctx.lineTo(projected[6].x, projected[6].y);
  ctx.closePath();
  ctx.fill();
}

function renderFlagPole(ctx, camera, viewport) {
  const base = projectPoint(vec3(-3.5, 0.7, 2.4), camera, viewport);
  const top = projectPoint(vec3(-3.5, 6.3, 2.4), camera, viewport);
  if (!base || !top) {
    return;
  }
  ctx.strokeStyle = "rgba(77, 52, 41, 0.95)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(top.x, top.y);
  ctx.stroke();
}

function renderShipShadow(
  ctx,
  shipModel,
  ship,
  state,
  camera,
  viewport,
  lightDir,
  shadowStrength,
  visuals
) {
  const bounds = shipModel.bounds;
  const keelY = (shipModel.physics.waterline ?? 0.42) - 0.28;
  const transform = { position: ship.position, rotationY: ship.rotationY, scale: SHIP_RENDER_SCALE };
  const hullCorners = [
    vec3(bounds.min[0], keelY, bounds.min[2]),
    vec3(bounds.max[0], keelY, bounds.min[2]),
    vec3(bounds.max[0], keelY, bounds.max[2]),
    vec3(bounds.min[0], keelY, bounds.max[2]),
  ].map((point) => transformPoint(point, transform));

  renderProjectedShadow(ctx, hullCorners, camera, viewport, lightDir, {
    planeY:
      sampleFluidSurfaceHeight(
        state,
        {
          ...visuals,
          waveAmplitude: 0.45,
        },
        ship.position.x,
        ship.position.z
      ) *
        0.14 -
      0.03,
    alpha: 0.08 + shadowStrength * 0.18,
    blur: 12 + shadowStrength * 24,
  });
}

function renderFlagShadow(ctx, flag, camera, viewport, lightDir, shadowStrength) {
  const clothPoints = [
    flag.positions[0],
    flag.positions[flag.cols - 1],
    flag.positions[flag.positions.length - 1],
    flag.positions[flag.positions.length - flag.cols],
  ];

  renderProjectedShadow(ctx, clothPoints, camera, viewport, lightDir, {
    planeY: 0.56,
    alpha: 0.05 + shadowStrength * 0.16,
    blur: 12 + shadowStrength * 18,
  });
}

function renderWaterHighlights(ctx, water, camera, viewport) {
  const direction = water.waveSettings.primaryDirection;
  const driftOffsetX = direction.x * 6;
  const driftOffsetY = -direction.z * 3.5;
  for (let row = 2; row < water.rows - 1; row += 2) {
    ctx.beginPath();
    let started = false;
    for (let column = 0; column < water.cols; column += 1) {
      const point = projectPoint(water.positions[row * water.cols + column], camera, viewport);
      if (!point) {
        continue;
      }
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x + driftOffsetX, point.y + driftOffsetY);
      }
    }
    if (started) {
      const alpha = row < water.rows * 0.45 ? 0.22 : 0.12;
      ctx.strokeStyle = `rgba(232, 247, 255, ${alpha})`;
      ctx.lineWidth = row < water.rows * 0.45 ? 1.3 : 0.9;
      ctx.stroke();
    }
  }
}

function renderFlagAccent(ctx, flag, camera, viewport) {
  const projected = flag.positions.map((point) => projectPoint(point, camera, viewport));
  ctx.strokeStyle = "rgba(255, 241, 226, 0.92)";
  ctx.lineWidth = 1.6;
  for (let row = 0; row < flag.rows; row += Math.max(1, Math.floor(flag.rows / 4))) {
    ctx.beginPath();
    let started = false;
    for (let column = 0; column < flag.cols; column += 1) {
      const point = projected[row * flag.cols + column];
      if (!point) {
        continue;
      }
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    if (started) {
      ctx.stroke();
    }
  }
}

function renderSprays(ctx, sprays, camera, viewport) {
  for (const spray of sprays) {
    const projected = projectPoint(spray.position, camera, viewport);
    if (!projected) {
      continue;
    }
    const radius = clamp((1 / projected.depth) * 260, 1.5, 7.5);
    ctx.fillStyle = `rgba(225, 243, 250, ${clamp(spray.life / 1.5, 0, 0.9)})`;
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderScene(ctx, canvas, dom, state, shipModel, description) {
  const visuals = description.visuals ?? {};
  const viewport = { width: canvas.width, height: canvas.height };
  const camera = buildCamera(canvas);
  const lightDir = normalizeVec3(vec3(-0.46, 0.84, -0.26));
  const reflectionStrength = clamp(visuals.reflectionStrength ?? 0.22, 0, 0.58);
  const shadowStrength = clamp((visuals.shadowAccent ?? 0.05) * 6, 0.18, 0.72);
  const water = buildWaterSurface(state, visuals);
  const flag = buildFlagSurface(state, visuals);

  drawSkyAndSea(ctx, canvas, state, visuals, shadowStrength, reflectionStrength);

  const solidTriangles = [];
  const waterTriangles = [];
  const reflectionTriangles = [];
  pushHarborGeometry(camera, viewport, solidTriangles, visuals);
  pushHarborReflections(state, visuals, camera, viewport, reflectionTriangles, reflectionStrength);

  for (let index = 0; index < water.indices.length; index += 3) {
    const aIndex = water.indices[index];
    const bIndex = water.indices[index + 1];
    const cIndex = water.indices[index + 2];
    const a = water.positions[aIndex];
    const b = water.positions[bIndex];
    const c = water.positions[cIndex];
    const projected = [projectPoint(a, camera, viewport), projectPoint(b, camera, viewport), projectPoint(c, camera, viewport)];
    if (projected.some((value) => value === null)) {
      continue;
    }
    const depthRatio = clamp((a.z + b.z + c.z) / 54, 0, 1);
    const normal = normalizeVec3(
      addVec3(
        addVec3(water.normals[aIndex], water.normals[bIndex]),
        water.normals[cIndex]
      )
    );
    waterTriangles.push({
      points: projected,
      depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
      worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
      normal,
      baseColor: {
        r: mix(water.nearColor.r, water.farColor.r, depthRatio),
        g: mix(water.nearColor.g, water.farColor.g, depthRatio),
        b: mix(water.nearColor.b, water.farColor.b, depthRatio),
      },
      accent: 0.02,
      alpha: 0.64 + reflectionStrength * 0.12,
    });
  }

  for (let index = 0; index < flag.indices.length; index += 3) {
    const a = flag.positions[flag.indices[index]];
    const b = flag.positions[flag.indices[index + 1]];
    const c = flag.positions[flag.indices[index + 2]];
    const projected = [projectPoint(a, camera, viewport), projectPoint(b, camera, viewport), projectPoint(c, camera, viewport)];
    if (projected.some((value) => value === null)) {
      continue;
    }
    const normal = normalizeVec3(crossVec3(subVec3(b, a), subVec3(c, a)));
    solidTriangles.push({
      points: projected,
      depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
      worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
      normal,
      baseColor: flag.color,
      accent: 0.08,
    });
    buildReflectionTrianglesFromWorldPoints(
      [a, b, c],
      flag.color,
      state,
      visuals,
      camera,
      viewport,
      reflectionTriangles,
      {
        reflectionStrength: reflectionStrength * 0.7,
      }
    );
  }

  for (const ship of state.ships) {
    buildTrianglesFromMesh(
      shipModel,
      { position: ship.position, rotationY: ship.rotationY, scale: SHIP_RENDER_SCALE },
      ship.tint,
      camera,
      viewport,
      solidTriangles,
      clamp(visuals.shadowAccent ?? 0.04, 0, 0.12)
    );
    buildReflectionTrianglesFromMesh(
      shipModel,
      { position: ship.position, rotationY: ship.rotationY, scale: SHIP_RENDER_SCALE },
      ship.tint,
      state,
      visuals,
      camera,
      viewport,
      reflectionTriangles,
      {
        reflectionStrength,
      }
    );
  }

  drawTriangles(ctx, reflectionTriangles, lightDir, reflectionStrength, camera, shadowStrength);
  drawTriangles(ctx, waterTriangles, lightDir, reflectionStrength, camera, shadowStrength);

  for (const ship of state.ships) {
    renderShipShadow(
      ctx,
      shipModel,
      ship,
      state,
      camera,
      viewport,
      lightDir,
      shadowStrength,
      visuals
    );
  }
  renderFlagShadow(ctx, flag, camera, viewport, lightDir, shadowStrength);

  renderWaterHighlights(ctx, water, camera, viewport);
  drawTriangles(ctx, solidTriangles, lightDir, reflectionStrength, camera, shadowStrength);
  renderFlagPole(ctx, camera, viewport);
  renderFlagAccent(ctx, flag, camera, viewport);
  for (const ship of state.ships) {
    renderShipRigging(ctx, ship, camera, viewport);
  }
  renderSprays(ctx, state.sprays, camera, viewport);

  setListContent(
    dom.sceneMetrics,
    description.sceneMetrics ?? [
      `ships: ${state.ships.length} active GLTF hulls`,
      `collisions: ${state.collisions}`,
      `sprays: ${state.sprays.length}`,
      `stress: ${state.stress ? "enabled" : "disabled"}`,
    ]
  );
  setListContent(dom.qualityMetrics, description.qualityMetrics ?? []);
  setListContent(dom.debugMetrics, description.debugMetrics ?? []);
  setListContent(dom.sceneNotes, description.notes ?? DEFAULT_SCENE_NOTES);
  dom.status.textContent = description.status ?? "3D scene live";
  dom.details.textContent =
    description.details ??
    "Ships are colliding with the GLTF physics metadata, while the package overlay reports its current live state.";
}

function updateTextState(state, shipModel, description) {
  const payload = {
    coordinateSystem: "right-handed world; +x right, +y up, +z forward from the shore",
    ships: state.ships.map((ship) => ({
      id: ship.id,
      x: Number(ship.position.x.toFixed(2)),
      y: Number(ship.position.y.toFixed(2)),
      z: Number(ship.position.z.toFixed(2)),
      vx: Number(ship.velocity.x.toFixed(2)),
      vz: Number(ship.velocity.z.toFixed(2)),
    })),
    collisions: state.collisions,
    sprays: state.sprays.length,
    waveImpulses: state.waveImpulses.length,
    stress: state.stress,
    shipPhysics: shipModel.physics,
    package: description.textState ?? {},
  };
  globalThis.window.render_game_to_text = () => JSON.stringify(payload);
}

function stepScene(state, shipModel, packageHooks, dt) {
  state.time += dt;
  state.frame += 1;
  const preDescription = packageHooks.describe?.(state.packageState, state) ?? {};
  const preVisuals = preDescription.visuals ?? {};
  updateShips(state, dt, shipModel, preVisuals);
  updateFluidImpulses(state, dt);
  updateSprays(state, dt);
  const updated = packageHooks.update?.(state.packageState, state, dt);
  if (updated !== undefined) {
    state.packageState = updated;
  }
}

export async function mountHarborShowcase(options = {}) {
  injectStyles();
  const root = options.root ?? globalThis.document?.body;
  if (!root) {
    throw new Error("Harbor showcase root element was not found.");
  }
  const dom = buildDemoDom(root, {
    packageName: options.packageName ?? "@plasius/gpu-package",
    title: options.title ?? "Package-local 3D Harbor Demo",
    subtitle:
      options.subtitle ??
      "A self-contained 3D harbor scene using a local GLTF ship asset and package-specific overlays.",
  });
  const packageState = options.createState?.() ?? {};
  const packageHooks = {
    update: options.updateState,
    describe: options.describeState,
  };
  const state = createState(packageState);
  const shipModel = await loadGltfModel(new URL("./assets/brigantine.gltf", import.meta.url));

  const ctx = dom.canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context could not be created for the harbor demo.");
  }

  const renderCurrentFrame = () => {
    const description = packageHooks.describe?.(state.packageState, state) ?? {};
    renderScene(ctx, dom.canvas, dom, state, shipModel, description);
    updateTextState(state, shipModel, description);
  };

  globalThis.window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let index = 0; index < steps; index += 1) {
      stepScene(state, shipModel, packageHooks, 1 / 60);
    }
    renderCurrentFrame();
  };

  const frameLoop = (nowMs) => {
    if (!state.paused) {
      if (state.lastTimeMs == null) {
        state.lastTimeMs = nowMs;
      }
      const dt = Math.min(0.033, (nowMs - state.lastTimeMs) / 1000);
      state.lastTimeMs = nowMs;
      stepScene(state, shipModel, packageHooks, dt);
    }
    renderCurrentFrame();
    globalThis.requestAnimationFrame(frameLoop);
  };

  dom.pauseButton.addEventListener("click", () => {
    state.paused = !state.paused;
    dom.pauseButton.textContent = state.paused ? "Resume" : "Pause";
  });
  dom.stressToggle.addEventListener("change", () => {
    state.stress = dom.stressToggle.checked;
  });

  globalThis.requestAnimationFrame(frameLoop);
  return {
    state,
    shipModel,
    canvas: dom.canvas,
  };
}
