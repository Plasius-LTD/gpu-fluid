struct FluidSimParams {
  cell_count: u32,
  dt: f32,
  gravity: f32,
  viscosity: f32,
};

@group(0) @binding(0) var<storage, read_write> volume_fraction: array<f32>;
@group(0) @binding(1) var<storage, read_write> pressure: array<f32>;
@group(0) @binding(2) var<storage, read_write> velocity: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> solid_boundary: array<u32>;
@group(0) @binding(4) var<storage, read_write> foam_mask: array<f32>;
@group(0) @binding(5) var<uniform> params: FluidSimParams;

fn is_solid(index: u32) -> bool {
  return solid_boundary[index] != 0u;
}

@compute @workgroup_size(64)
fn volume_advection(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= params.cell_count || is_solid(index)) {
    return;
  }

  let v = clamp(volume_fraction[index], 0.0, 1.0);
  let gravity_velocity = vec4<f32>(0.0, params.gravity * params.dt * v, 0.0, 0.0);
  velocity[index] = velocity[index] + gravity_velocity;
}

@compute @workgroup_size(64)
fn pressure_projection(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= params.cell_count || is_solid(index)) {
    return;
  }

  let divergence_estimate = abs(velocity[index].x) + abs(velocity[index].y) + abs(velocity[index].z);
  pressure[index] = mix(pressure[index], volume_fraction[index] + divergence_estimate * 0.125, 0.5);
  velocity[index].xyz = velocity[index].xyz * (1.0 - clamp(params.viscosity, 0.0, 0.95));
}

@compute @workgroup_size(64)
fn boundary_coupling(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= params.cell_count) {
    return;
  }

  if (is_solid(index)) {
    volume_fraction[index] = 0.0;
    velocity[index] = vec4<f32>(0.0);
    pressure[index] = 0.0;
  }
}

@compute @workgroup_size(64)
fn free_surface_extraction(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= params.cell_count || is_solid(index)) {
    return;
  }

  let free_surface = volume_fraction[index] > 0.04 && volume_fraction[index] < 0.98;
  foam_mask[index] = select(foam_mask[index] * 0.94, max(foam_mask[index], abs(velocity[index].y) * 0.12), free_surface);
}

@compute @workgroup_size(64)
fn surface_band_update(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= params.cell_count || is_solid(index)) {
    return;
  }

  pressure[index] = mix(pressure[index], volume_fraction[index], 0.2);
}

@compute @workgroup_size(64)
fn foam_spray_mask(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= params.cell_count || is_solid(index)) {
    return;
  }

  let speed = length(velocity[index].xyz);
  foam_mask[index] = clamp(max(foam_mask[index] * 0.92, speed * 0.05), 0.0, 1.0);
}
