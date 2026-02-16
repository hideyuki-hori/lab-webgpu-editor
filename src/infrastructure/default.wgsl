@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / u.resolution;
  let t = u.time;

  let p = (uv - 0.5) * 2.0;
  let d = length(p);

  let a = atan2(p.y, p.x);

  let ring1 = smoothstep(0.02, 0.0, abs(d - 0.4 - 0.05 * sin(a * 6.0 + t * 2.0)));
  let ring2 = smoothstep(0.02, 0.0, abs(d - 0.6 - 0.08 * sin(a * 8.0 - t * 1.5)));
  let ring3 = smoothstep(0.02, 0.0, abs(d - 0.8 - 0.03 * cos(a * 12.0 + t * 3.0)));

  let glow = exp(-d * 2.5) * 0.6;

  let mp = (u.mouse / u.resolution - 0.5) * 2.0;
  let md = length(p - mp);
  let mouse_glow = exp(-md * 4.0) * 0.4;

  let r = ring1 * 0.3 + ring2 * 0.8 + ring3 * 0.2 + glow * (0.5 + 0.5 * sin(t)) + mouse_glow * 0.9;
  let g = ring1 * 0.6 + ring2 * 0.3 + ring3 * 0.7 + glow * (0.5 + 0.5 * cos(t * 0.7)) + mouse_glow * 0.3;
  let b = ring1 * 0.9 + ring2 * 0.5 + ring3 * 0.9 + glow * (0.5 + 0.5 * sin(t * 1.3)) + mouse_glow * 0.6;

  let wave = sin(p.x * 10.0 + t) * sin(p.y * 10.0 + t * 0.8) * 0.05;

  let bg = vec3f(0.02 + wave, 0.01 + wave * 0.5, 0.05 + wave);

  let col = bg + vec3f(r, g, b);

  return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
}
