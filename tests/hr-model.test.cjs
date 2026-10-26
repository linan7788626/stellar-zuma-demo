'use strict';

// 纯模型测试：只依赖 Node 内置 test runner 与 js/hr-model.js。
// 数值均为手算/设计文档给定，不用被测函数反推期望值。

const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../js/hr-model.js');

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be close to ${expected} (±${tolerance})`
  );
}

test('exports the shared model interface names', () => {
  assert.equal(typeof Model.project, 'function');
  assert.equal(typeof Model.radiusOf, 'function');
  assert.equal(typeof Model.luminosityAtRadius, 'function');
  assert.ok(Array.isArray(Model.spectral));
  assert.ok(Array.isArray(Model.regions));
  assert.ok(Array.isArray(Model.evolution));
  assert.ok(Model.SUN && typeof Model.SUN === 'object');
  assert.ok(Model.BOUNDS && typeof Model.BOUNDS === 'object');
});

test('SUN reference point is T=5772 K, L=1, R=1', () => {
  assert.equal(Model.SUN.temperature, 5772);
  assert.equal(Model.SUN.luminosity, 1);
  assert.equal(Model.SUN.radius, 1);
});

test('BOUNDS match the shared diagram range', () => {
  assert.equal(Model.BOUNDS.minTemperature, 2500);
  assert.equal(Model.BOUNDS.maxTemperature, 100000);
  assert.equal(Model.BOUNDS.minLuminosity, 1e-4);
  assert.equal(Model.BOUNDS.maxLuminosity, 1e6);
});

test('radiusOf: the Sun has R=1', () => {
  close(Model.radiusOf({ temperature: 5772, luminosity: 1 }), 1);
});

test('radiusOf: same temperature with L=100 gives R=10', () => {
  close(Model.radiusOf({ temperature: 5772, luminosity: 100 }), 10);
});

test('luminosityAtRadius: T=11544 K with R=1 gives L=16', () => {
  close(Model.luminosityAtRadius(11544, 1), 16);
});

test('radiusOf and luminosityAtRadius are inverse operations', () => {
  const points = [
    { temperature: 5772, luminosity: 100 },
    { temperature: 11544, luminosity: 16 },
    { temperature: 3200, luminosity: 2000 },
    { temperature: 35000, luminosity: 100000 },
  ];
  for (const point of points) {
    const radius = Model.radiusOf(point);
    close(
      Model.luminosityAtRadius(point.temperature, radius),
      point.luminosity,
      1e-6 * Math.max(1, point.luminosity)
    );
  }
});

test('project: geometric midpoint of both axes maps to (0.5, 0.5)', () => {
  const p = Model.project({ temperature: Math.sqrt(2500 * 100000), luminosity: 10 });
  close(p.x, 0.5);
  close(p.y, 0.5);
  assert.equal(p.inside, true);
});

test('project: the Sun sits at y=0.6', () => {
  const p = Model.project(Model.SUN);
  close(p.y, 0.6);
  assert.equal(p.inside, true);
});

test('project: hotter stars are drawn on the left', () => {
  const hot = Model.project({ temperature: 20000, luminosity: 100 });
  const cool = Model.project({ temperature: 4000, luminosity: 100 });
  assert.ok(hot.x < cool.x, `hot x=${hot.x} should be left of cool x=${cool.x}`);
});

test('project: more luminous stars are drawn higher up', () => {
  const bright = Model.project({ temperature: 5772, luminosity: 100000 });
  const dim = Model.project({ temperature: 5772, luminosity: 0.003 });
  assert.ok(bright.y < dim.y, `bright y=${bright.y} should be above dim y=${dim.y}`);
});

test('project rejects zero, negative, NaN and Infinity inputs', () => {
  const badPoints = [
    { temperature: 0, luminosity: 1 },
    { temperature: -5000, luminosity: 1 },
    { temperature: NaN, luminosity: 1 },
    { temperature: Infinity, luminosity: 1 },
    { temperature: 5772, luminosity: 0 },
    { temperature: 5772, luminosity: -1 },
    { temperature: 5772, luminosity: NaN },
    { temperature: 5772, luminosity: Infinity },
  ];
  for (const point of badPoints) {
    assert.throws(() => Model.project(point), RangeError, JSON.stringify(point));
  }
});

test('project rejects non-object and non-number inputs', () => {
  assert.throws(() => Model.project(null), RangeError);
  assert.throws(() => Model.project(), RangeError);
  assert.throws(() => Model.project({ temperature: '5772', luminosity: 1 }), RangeError);
  assert.throws(() => Model.project({ temperature: 5772 }), RangeError);
});

test('radiusOf rejects invalid star points', () => {
  assert.throws(() => Model.radiusOf({ temperature: 0, luminosity: 1 }), RangeError);
  assert.throws(() => Model.radiusOf({ temperature: 5772, luminosity: -2 }), RangeError);
  assert.throws(() => Model.radiusOf({ temperature: NaN, luminosity: 1 }), RangeError);
  assert.throws(() => Model.radiusOf({ temperature: 5772, luminosity: Infinity }), RangeError);
  assert.throws(() => Model.radiusOf(null), RangeError);
});

test('luminosityAtRadius rejects invalid inputs', () => {
  assert.throws(() => Model.luminosityAtRadius(5772, 0), RangeError);
  assert.throws(() => Model.luminosityAtRadius(5772, -1), RangeError);
  assert.throws(() => Model.luminosityAtRadius(5772, Infinity), RangeError);
  assert.throws(() => Model.luminosityAtRadius(5772, NaN), RangeError);
  assert.throws(() => Model.luminosityAtRadius(-1, 1), RangeError);
  assert.throws(() => Model.luminosityAtRadius(NaN, 1), RangeError);
  assert.throws(() => Model.luminosityAtRadius(0, 1), RangeError);
});

test('project keeps legal out-of-range points unclamped and inside=false', () => {
  const upperLeft = Model.project({ temperature: 150000, luminosity: 1e7 });
  assert.equal(upperLeft.inside, false);
  assert.ok(upperLeft.x < 0, `x=${upperLeft.x} should extend past the left edge`);
  assert.ok(upperLeft.y < 0, `y=${upperLeft.y} should extend past the top edge`);

  const lowerRight = Model.project({ temperature: 1000, luminosity: 1e-5 });
  assert.equal(lowerRight.inside, false);
  assert.ok(lowerRight.x > 1, `x=${lowerRight.x} should extend past the right edge`);
  assert.ok(lowerRight.y > 1, `y=${lowerRight.y} should extend past the bottom edge`);
});

test('spectral covers OBAFGKM with the designed representative points', () => {
  assert.deepEqual(
    Model.spectral.map(s => s.id),
    ['O', 'B', 'A', 'F', 'G', 'K', 'M']
  );
  const expected = [
    ['O', 35000, 100000],
    ['B', 18000, 800],
    ['A', 8500, 20],
    ['F', 6500, 3],
    ['G', 5772, 1],
    ['K', 4500, 0.2],
    ['M', 3200, 0.01],
  ];
  Model.spectral.forEach((entry, i) => {
    assert.equal(entry.temperature, expected[i][1], `${entry.id} temperature`);
    assert.equal(entry.luminosity, expected[i][2], `${entry.id} luminosity`);
    assert.equal(typeof entry.name, 'string', `${entry.id} name`);
    assert.ok(entry.name.length > 0, `${entry.id} name should not be empty`);
    assert.match(entry.color, /^#[0-9a-f]{6}$/i, `${entry.id} color should be a hex color`);
    const p = Model.project(entry);
    assert.equal(p.inside, true, `${entry.id} should sit inside bounds`);
  });
});

test('regions list supergiant, giant and white-dwarf in contract order', () => {
  assert.deepEqual(
    Model.regions.map(r => r.id),
    ['supergiant', 'giant', 'white-dwarf']
  );
  for (const region of Model.regions) {
    assert.equal(typeof region.name, 'string');
    assert.ok(region.name.length > 0);
    assert.equal(typeof region.classification, 'string');
    assert.ok(region.classification.length > 0);
    assert.equal(region.temperature.length, 2);
    assert.equal(region.luminosity.length, 2);
    assert.ok(region.temperature[0] < region.temperature[1], `${region.id} temperature range`);
    assert.ok(region.luminosity[0] < region.luminosity[1], `${region.id} luminosity range`);
    // region boxes stay inside the shared diagram bounds
    assert.ok(region.temperature[0] >= Model.BOUNDS.minTemperature, `${region.id} min T`);
    assert.ok(region.temperature[1] <= Model.BOUNDS.maxTemperature, `${region.id} max T`);
    assert.ok(region.luminosity[0] >= Model.BOUNDS.minLuminosity, `${region.id} min L`);
    assert.ok(region.luminosity[1] <= Model.BOUNDS.maxLuminosity, `${region.id} max L`);
    // marker sits inside its own region box and inside the bounds
    const marker = region.marker;
    assert.ok(marker.temperature >= region.temperature[0] && marker.temperature <= region.temperature[1]);
    assert.ok(marker.luminosity >= region.luminosity[0] && marker.luminosity <= region.luminosity[1]);
    assert.equal(Model.project(marker).inside, true, `${region.id} marker should be inside bounds`);
  }
});

test('evolution paths match the designed teaching nodes', () => {
  assert.deepEqual(
    Model.evolution.map(e => e.id),
    ['sun-like', 'massive']
  );

  const sunLike = Model.evolution[0];
  const expectedSun = [
    [5772, 1],
    [5500, 10],
    [4200, 100],
    [3200, 2000],
    [30000, 2000],
    [100000, 100],
    [20000, 0.01],
  ];
  assert.deepEqual(
    sunLike.points,
    expectedSun.map(([temperature, luminosity]) => ({ temperature, luminosity }))
  );
  // stages 只保留课程阶段：太阳链恰为 4 项，pointIndex 依次精确映射 0、2、4、6
  assert.deepEqual(
    sunLike.stages.map(s => s.pointIndex),
    [0, 2, 4, 6]
  );
  assert.deepEqual(
    sunLike.stages.map(s => s.name),
    ['G 型主序星', '红巨星', '行星状星云中心星', '白矮星']
  );

  const massive = Model.evolution[1];
  const expectedMassive = [
    [35000, 100000],
    [30000, 150000],
    [20000, 200000],
    [8000, 200000],
    [3500, 200000],
  ];
  assert.deepEqual(
    massive.points,
    expectedMassive.map(([temperature, luminosity]) => ({ temperature, luminosity }))
  );
  // stages 只保留课程阶段：大质量链恰为 3 项，pointIndex 依次精确映射 0、2、4
  assert.deepEqual(
    massive.stages.map(s => s.pointIndex),
    [0, 2, 4]
  );
  assert.deepEqual(
    massive.stages.map(s => s.name),
    ['主序热端 · O 型星', '蓝超巨星', '红超巨星']
  );

  for (const chain of Model.evolution) {
    assert.equal(typeof chain.name, 'string');
    assert.ok(chain.name.length > 0);
    for (const point of chain.points) {
      assert.equal(
        Model.project(point).inside,
        true,
        `${chain.id} node (${point.temperature}, ${point.luminosity}) should stay inside bounds`
      );
    }
    for (const stage of chain.stages) {
      assert.equal(typeof stage.name, 'string');
      assert.ok(stage.name.length > 0);
      assert.ok(stage.pointIndex >= 0 && stage.pointIndex < chain.points.length);
    }
  }
});
