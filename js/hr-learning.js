'use strict';

/**
 * StellarHRLearning — 纯读图练习会话（合成教学数据）。
 *
 * 同一实现同时服务两种加载方式：
 * - 浏览器普通脚本：<script src="js/hr-learning.js"></script> 后通过 window.StellarHRLearning 访问；
 * - Node 测试：require('../js/hr-learning.js')。
 *
 * 题目逻辑不依赖 DOM/浏览器事件；半径判断复用 StellarHRModel.radiusOf，不复制公式。
 * 本次练习统计只在会话内累计，不触及游戏分数、存档或解锁。
 */

let Model;
if (typeof module === 'object' && module.exports) {
  Model = require('./hr-model.js');
} else {
  Model = window.StellarHRModel;
}

const KINDS = ['temperature', 'luminosity', 'radius'];

const CHOICES = [
  { id: 'a', text: '甲' },
  { id: 'b', text: '乙' },
  { id: 'same', text: '一样' },
];

// 各题型 3 个确定变体：基础、交换甲乙、相等。甲/乙为练习示意星（合成数据）。
const VARIANTS = {
  temperature: [
    {
      stars: [
        { label: '甲', temperature: 20000, luminosity: 1 },
        { label: '乙', temperature: 4000, luminosity: 1 },
      ],
    },
    {
      stars: [
        { label: '甲', temperature: 4000, luminosity: 1 },
        { label: '乙', temperature: 20000, luminosity: 1 },
      ],
    },
    {
      stars: [
        { label: '甲', temperature: 20000, luminosity: 1 },
        { label: '乙', temperature: 20000, luminosity: 100 },
      ],
    },
  ],
  luminosity: [
    {
      stars: [
        { label: '甲', temperature: 5772, luminosity: 100 },
        { label: '乙', temperature: 5772, luminosity: 1 },
      ],
    },
    {
      stars: [
        { label: '甲', temperature: 5772, luminosity: 1 },
        { label: '乙', temperature: 5772, luminosity: 100 },
      ],
    },
    {
      stars: [
        { label: '甲', temperature: 8500, luminosity: 100 },
        { label: '乙', temperature: 4500, luminosity: 100 },
      ],
    },
  ],
  radius: [
    {
      stars: [
        { label: '甲', temperature: 5772, luminosity: 100 },
        { label: '乙', temperature: 5772, luminosity: 1 },
      ],
    },
    {
      stars: [
        { label: '甲', temperature: 5772, luminosity: 1 },
        { label: '乙', temperature: 5772, luminosity: 100 },
      ],
    },
    {
      stars: [
        { label: '甲', temperature: 5772, luminosity: 1 },
        { label: '乙', temperature: 11544, luminosity: 16 },
      ],
    },
  ],
};

const PROMPTS = {
  temperature: '哪颗星的表面温度更高？',
  luminosity: '哪颗星的光度更大？',
  radius: '哪颗星的半径更大？',
};

const RADIUS_EPSILON = 1e-9;

function formatValue(value) {
  return String(value);
}

function radiusText(star) {
  const radius = Model.radiusOf(star);
  const rounded = Math.round(radius * 100) / 100;
  return `${rounded} R☉`;
}

function describeStar(star) {
  return `${star.label}（T=${formatValue(star.temperature)} K，L=${formatValue(star.luminosity)} L☉）`;
}

function explain(kind, stars) {
  const [first, second] = stars;
  switch (kind) {
    case 'temperature': {
      if (first.temperature === second.temperature) {
        return (
          `${describeStar(first)}，${describeStar(second)}。` +
          `两星表面温度同为 ${formatValue(first.temperature)} K：横轴上位置相同（x 坐标相同），表面温度一样高；` +
          '光度不同只影响纵向位置与半径，不代表温度不同。'
        );
      }
      const hot = first.temperature > second.temperature ? first : second;
      const cold = hot === first ? second : first;
      return (
        `${describeStar(first)}，${describeStar(second)}。` +
        '赫罗图横轴为温度且左热右冷：' +
        `${hot.label} T=${formatValue(hot.temperature)} K 位于图中更左侧，` +
        `${cold.label} T=${formatValue(cold.temperature)} K 位于更右侧，` +
        `因此 ${hot.label} 的表面温度更高。`
      );
    }
    case 'luminosity': {
      if (first.luminosity === second.luminosity) {
        return (
          `${describeStar(first)}，${describeStar(second)}。` +
          `两星光度同为 ${formatValue(first.luminosity)} L☉：纵轴上位置相同（y 坐标相同），光度一样大；` +
          '温度不同只影响横向位置。注意区分：光度是恒星每秒输出的总能量，视亮度还取决于距离。'
        );
      }
      const bright = first.luminosity > second.luminosity ? first : second;
      const dim = bright === first ? second : first;
      return (
        `${describeStar(first)}，${describeStar(second)}。` +
        '赫罗图纵轴为光度且上亮下暗：' +
        `${bright.label} L=${formatValue(bright.luminosity)} L☉ 位于图中更高处，` +
        `${dim.label} L=${formatValue(dim.luminosity)} L☉ 位于更下方，` +
        `因此 ${bright.label} 的光度更大。` +
        '注意区分：光度是恒星每秒输出的总能量，视亮度还取决于距离——光度大的星不一定看起来更亮。'
      );
    }
    case 'radius': {
      const radiusFirst = Model.radiusOf(first);
      const radiusSecond = Model.radiusOf(second);
      if (Math.abs(radiusFirst - radiusSecond) <= RADIUS_EPSILON) {
        return (
          `${describeStar(first)}，${describeStar(second)}。` +
          `依据 L∝R²T⁴（R=√L×(5772 K/T)²）：两星半径都约为 ${radiusText(first)}。` +
          '温度更高但光度按比例更大时，半径可以相同。'
        );
      }
      const bigger = radiusFirst > radiusSecond ? first : second;
      if (first.temperature === second.temperature) {
        const bright = first.luminosity > second.luminosity ? first : second;
        const dim = bright === first ? second : first;
        const lumRatio = bright.luminosity / dim.luminosity;
        const radiusRatio = Math.sqrt(lumRatio);
        return (
          `${describeStar(first)}，${describeStar(second)}。` +
          `两星温度同为 ${formatValue(first.temperature)} K：同温时 L∝R²，` +
          `光度比 ${formatValue(lumRatio)} → 半径比 √${formatValue(lumRatio)} = ${formatValue(radiusRatio)}，` +
          `即 ${bright.label} R≈${radiusText(bright)}、${dim.label} R≈${radiusText(dim)}。` +
          `物理结论：同温度下更亮的星就是更大的星，${bigger.label}的半径更大。`
        );
      }
      return (
        `${describeStar(first)}，${describeStar(second)}。` +
        `依据 L∝R²T⁴（R=√L×(5772 K/T)²）：${first.label} 半径约为 ${radiusText(first)}，` +
        `${second.label} 半径约为 ${radiusText(second)}，${bigger.label}的半径更大。`
      );
    }
    default:
      throw new RangeError(`unknown kind: ${String(kind)}`);
  }
}

function correctChoiceFor(kind, stars) {
  const [first, second] = stars;
  let greater;
  switch (kind) {
    case 'temperature':
      greater = first.temperature > second.temperature ? 'a' : second.temperature > first.temperature ? 'b' : 'same';
      break;
    case 'luminosity':
      greater =
        first.luminosity > second.luminosity ? 'a' : second.luminosity > first.luminosity ? 'b' : 'same';
      break;
    case 'radius': {
      // 复用 Model.radiusOf 判断半径，不复制公式。
      const radiusFirst = Model.radiusOf(first);
      const radiusSecond = Model.radiusOf(second);
      if (Math.abs(radiusFirst - radiusSecond) <= RADIUS_EPSILON) {
        greater = 'same';
      } else {
        greater = radiusFirst > radiusSecond ? 'a' : 'b';
      }
      break;
    }
    default:
      throw new RangeError(`unknown kind: ${String(kind)}`);
  }
  return greater;
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (value && typeof value === 'object') {
    const copy = {};
    for (const key of Object.keys(value)) copy[key] = deepClone(value[key]);
    return copy;
  }
  return value;
}

function shuffledChoices(random) {
  const choices = CHOICES.map(choice => ({ id: choice.id, text: choice.text }));
  // random 仅用于选项展示顺序（Fisher–Yates）。
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = choices[i];
    choices[i] = choices[j];
    choices[j] = tmp;
  }
  return choices;
}

function createSession(options) {
  const config = options || {};
  const random = typeof config.random === 'function' ? config.random : Math.random;

  let kind = 'temperature';
  const variantIndex = { temperature: 0, luminosity: 0, radius: 0 };
  let questionId = 0;

  let current = null;
  let answered = false;
  let selectedChoiceId = null;
  let correct = null;
  let totalsAnswered = 0;
  let totalsCorrect = 0;

  function buildQuestion() {
    const stars = VARIANTS[kind][variantIndex[kind]].stars.map(star => Object.assign({}, star));
    questionId += 1;
    // 确定性变体轮换：按当前变体出题，然后推进到下一变体。
    variantIndex[kind] = (variantIndex[kind] + 1) % VARIANTS[kind].length;
    return {
      id: `${kind}-${questionId}`,
      kind,
      prompt: PROMPTS[kind],
      stars,
      choices: shuffledChoices(random),
      correctChoiceId: correctChoiceFor(kind, stars),
      explanation: explain(kind, stars),
    };
  }

  function snapshot() {
    return {
      question: deepClone(current),
      answered,
      selectedChoiceId,
      correct,
      totals: { answered: totalsAnswered, correct: totalsCorrect },
    };
  }

  function next(nextKind) {
    if (nextKind !== undefined) {
      if (!KINDS.includes(nextKind)) {
        throw new RangeError(`unknown question kind: ${String(nextKind)}`);
      }
      kind = nextKind;
    }
    current = buildQuestion();
    answered = false;
    selectedChoiceId = null;
    correct = null;
    return snapshot();
  }

  function answer(choiceId) {
    if (typeof choiceId !== 'string' || !CHOICES.some(choice => choice.id === choiceId)) {
      // 无效选项：不改变状态，也不计入统计。
      return snapshot();
    }
    if (answered) {
      // 重复作答保护：同一题只计一次。
      return snapshot();
    }
    answered = true;
    selectedChoiceId = choiceId;
    correct = choiceId === current.correctChoiceId;
    totalsAnswered += 1;
    if (correct) totalsCorrect += 1;
    return snapshot();
  }

  current = buildQuestion();

  return {
    snapshot,
    answer,
    next,
  };
}

const StellarHRLearning = Object.freeze({
  kinds: KINDS,
  createSession,
});

if (typeof module === 'object' && module.exports) {
  module.exports = StellarHRLearning;
}
if (typeof window !== 'undefined') {
  window.StellarHRLearning = StellarHRLearning;
}
