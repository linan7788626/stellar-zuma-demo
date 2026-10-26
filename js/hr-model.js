'use strict';

/**
 * StellarHRModel — 纯物理赫罗图模型（合成教学数据）。
 *
 * 同一实现同时服务两种加载方式：
 * - 浏览器普通脚本：<script src="js/hr-model.js"></script> 后通过 window.StellarHRModel 访问；
 * - Node 测试：require('../js/hr-model.js')。
 *
 * 数据为人工选择的合成教学代表点/示意路径，不代表任何真实恒星的观测值。
 * 物理：横轴温度（对数、左热右冷），纵轴光度（对数、上亮下暗），
 * 等半径线依据 L/L☉ = (R/R☉)² × (T/5772 K)⁴。
 */

const SUN = Object.freeze({ temperature: 5772, luminosity: 1, radius: 1 });

const BOUNDS = Object.freeze({
  minTemperature: 2500,
  maxTemperature: 100000,
  minLuminosity: 1e-4,
  maxLuminosity: 1e6,
});

const LOG_MIN_T = Math.log(BOUNDS.minTemperature);
const LOG_MAX_T = Math.log(BOUNDS.maxTemperature);
const LOG_MIN_L = Math.log(BOUNDS.minLuminosity);
const LOG_MAX_L = Math.log(BOUNDS.maxLuminosity);

function assertPositiveFinite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number, got ${String(value)}`);
  }
}

function assertStarPoint(point) {
  if (!point || typeof point !== 'object') {
    throw new RangeError('expected a star point {temperature, luminosity}');
  }
  assertPositiveFinite(point.temperature, 'temperature');
  assertPositiveFinite(point.luminosity, 'luminosity');
}

/**
 * 把 (T, L) 投影到 0–1 归一化坐标：x 左→右（左热右冷），y 上→下（上亮下暗）。
 * 合法但越界的数据不夹断，直接外推并标记 inside=false。
 */
function project(point) {
  assertStarPoint(point);
  const x = (LOG_MAX_T - Math.log(point.temperature)) / (LOG_MAX_T - LOG_MIN_T);
  const y = (LOG_MAX_L - Math.log(point.luminosity)) / (LOG_MAX_L - LOG_MIN_L);
  const inside =
    point.temperature >= BOUNDS.minTemperature &&
    point.temperature <= BOUNDS.maxTemperature &&
    point.luminosity >= BOUNDS.minLuminosity &&
    point.luminosity <= BOUNDS.maxLuminosity;
  return { x, y, inside };
}

/** 由 L/L☉ = (R/R☉)²(T/5772 K)⁴ 反解半径（R/R☉）。 */
function radiusOf(point) {
  assertStarPoint(point);
  return Math.sqrt(point.luminosity) * Math.pow(5772 / point.temperature, 2);
}

/** 由温度与半径求光度（L/L☉），与 radiusOf 互为逆运算。 */
function luminosityAtRadius(temperature, radius) {
  assertPositiveFinite(temperature, 'temperature');
  assertPositiveFinite(radius, 'radius');
  return Math.pow(radius, 2) * Math.pow(temperature / 5772, 4);
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

// 光谱主序代表点（OBAFGKM 顺序），颜色为教学示意色。
const spectral = deepFreeze([
  { id: 'O', name: 'O 型（蓝）', temperature: 35000, luminosity: 100000, color: '#9bb0ff' },
  { id: 'B', name: 'B 型（蓝白）', temperature: 18000, luminosity: 800, color: '#aabfff' },
  { id: 'A', name: 'A 型（白）', temperature: 8500, luminosity: 20, color: '#cad7ff' },
  { id: 'F', name: 'F 型（黄白）', temperature: 6500, luminosity: 3, color: '#f8f7ff' },
  { id: 'G', name: 'G 型（黄，含太阳）', temperature: 5772, luminosity: 1, color: '#fff4ea' },
  { id: 'K', name: 'K 型（橙）', temperature: 4500, luminosity: 0.2, color: '#ffd2a1' },
  { id: 'M', name: 'M 型（红）', temperature: 3200, luminosity: 0.01, color: '#ffcc6f' },
]);

// 区域示意范围（教学示意，不是精确分类阈值）。
// 选取依据：巨星 L≈30–10⁴、T≈3000–8000；超巨星 L≈10⁴–10⁶、T≈3000–20000；
// 白矮星 L≈10⁻⁴–0.1、T≈5000–30000，全部落在共享 BOUNDS 内。
const regions = deepFreeze([
  {
    id: 'supergiant',
    name: '超巨星区（示意）',
    classification: '超巨星',
    temperature: [3000, 20000],
    luminosity: [1e4, 1e6],
    marker: { temperature: 4000, luminosity: 1e5 },
  },
  {
    id: 'giant',
    name: '巨星区（示意）',
    classification: '巨星',
    temperature: [3000, 8000],
    luminosity: [30, 1e4],
    marker: { temperature: 4500, luminosity: 1000 },
  },
  {
    id: 'white-dwarf',
    name: '白矮星区（示意）',
    classification: '白矮星',
    temperature: [5000, 30000],
    luminosity: [1e-4, 0.1],
    marker: { temperature: 15000, luminosity: 0.01 },
  },
]);

// 演化示意路径（教学示意，节点间隔不代表真实时标）。
// 类太阳：现有四个课程阶段对应第 0、2、4、6 个节点；
// 大质量：现有三个阶段对应第 0、2、4 个节点。
const evolution = deepFreeze([
  {
    id: 'sun-like',
    name: '类太阳恒星演化路径（教学示意）',
    points: [
      { temperature: 5772, luminosity: 1 },
      { temperature: 5500, luminosity: 10 },
      { temperature: 4200, luminosity: 100 },
      { temperature: 3200, luminosity: 2000 },
      { temperature: 30000, luminosity: 2000 },
      { temperature: 100000, luminosity: 100 },
      { temperature: 20000, luminosity: 0.01 },
    ],
    // stages 只保留现有课程阶段（第 0、2、4、6 个节点）；
    // 中间节点仍保留在 points 中，但不作为独立课程阶段命名。
    stages: [
      { name: 'G 型主序星', pointIndex: 0 },
      { name: '红巨星', pointIndex: 2 },
      { name: '行星状星云中心星', pointIndex: 4 },
      { name: '白矮星', pointIndex: 6 },
    ],
  },
  {
    id: 'massive',
    name: '大质量恒星演化路径（教学示意）',
    points: [
      { temperature: 35000, luminosity: 100000 },
      { temperature: 30000, luminosity: 150000 },
      { temperature: 20000, luminosity: 200000 },
      { temperature: 8000, luminosity: 200000 },
      { temperature: 3500, luminosity: 200000 },
    ],
    // stages 只保留现有课程阶段（第 0、2、4 个节点）；
    // 中间节点仍保留在 points 中，但不作为独立课程阶段命名。
    stages: [
      { name: '主序热端 · O 型星', pointIndex: 0 },
      { name: '蓝超巨星', pointIndex: 2 },
      { name: '红超巨星', pointIndex: 4 },
    ],
  },
]);

const StellarHRModel = Object.freeze({
  SUN,
  BOUNDS,
  spectral,
  regions,
  evolution,
  project,
  radiusOf,
  luminosityAtRadius,
});

if (typeof module === 'object' && module.exports) {
  module.exports = StellarHRModel;
}
if (typeof window !== 'undefined') {
  window.StellarHRModel = StellarHRModel;
}
