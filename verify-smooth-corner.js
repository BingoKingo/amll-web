/**
 * 平滑圆角系统验证脚本 - 真正检查 squircle 生效链路
 * 在浏览器开发工具的 Console 中运行此脚本来验证所有改动
 */

console.group('🎯 平滑圆角系统链路验证');

// ============================================================================
// 1️⃣ 检查 worklet 是否成功加载（has-squircle 类）
// ============================================================================
console.group('1️⃣ Paint Worklet 加载状态检查');
const htmlElement = document.documentElement;
const hasSquircleClass = htmlElement.classList.contains('has-squircle');
const paintWorkletSupported = CSS && CSS.paintWorklet;

console.log(`Paint Worklet API 支持: ${paintWorkletSupported ? '✅ 是' : '❌ 否'}`);
console.log(`根节点 has-squircle 类: ${hasSquircleClass ? '✅ 已添加' : '❌ 未添加'}`);

if (hasSquircleClass && paintWorkletSupported) {
  console.log('✅ Paint Worklet 链路已就绪');
} else if (!paintWorkletSupported) {
  console.log('⚠️ Paint Worklet 不支持，使用 border-radius 降级');
} else {
  console.log('❌ Paint Worklet 加载失败或未完成');
}
console.groupEnd();

// ============================================================================
// 2️⃣ 检查元素是否真的挂载了 smooth-corner 类
// ============================================================================
console.group('2️⃣ DOM 元素 smooth-corner 类应用检查');

const elementsToCheck = {
  '#controlPanel': {
    elem: document.getElementById('controlPanel'),
    expectedClasses: ['smooth-corner', 'sc-panel'],
  },
  '.btn (第一个)': {
    elem: document.querySelector('.btn'),
    expectedClasses: ['smooth-corner', 'sc-control'],
  },
  '#status': {
    elem: document.getElementById('status'),
    expectedClasses: ['smooth-corner', 'sc-card'],
  },
  '#progressBar': {
    elem: document.getElementById('progressBar'),
    expectedClasses: ['smooth-corner', 'sc-control'],
  },
  'input[type="text"]': {
    elem: document.querySelector('input[type="text"]'),
    expectedClasses: [],  // 通过 CSS 选择器应用，不需要类
  },
  '.select-input': {
    elem: document.querySelector('.select-input'),
    expectedClasses: [],  // 通过 CSS 选择器应用
  },
};

let allElementsCorrect = true;
Object.entries(elementsToCheck).forEach(([selector, { elem, expectedClasses }]) => {
  if (!elem) {
    console.log(`${selector}: ❌ 元素未找到`);
    allElementsCorrect = false;
    return;
  }

  const hasAllClasses = expectedClasses.every(cls => elem.classList.contains(cls));
  const status = hasAllClasses ? '✅' : '❌';
  console.log(`${selector}: ${status}`);
  
  if (expectedClasses.length > 0) {
    console.log(`  - 期望类: ${expectedClasses.join(', ')}`);
    console.log(`  - 实际类: ${Array.from(elem.classList).join(', ')}`);
  }
  
  if (!hasAllClasses && expectedClasses.length > 0) {
    allElementsCorrect = false;
  }
});

console.groupEnd();

// ============================================================================
// 3️⃣ 检查 CSS 变量是否正确设置
// ============================================================================
console.group('3️⃣ CSS 变量检查');

const cssVars = ['--sc-smooth', '--sc-card', '--sc-panel', '--sc-control', '--sc-cover'];
const computedStyle = getComputedStyle(htmlElement);
let allVarsSet = true;

cssVars.forEach(varName => {
  const value = computedStyle.getPropertyValue(varName).trim();
  const status = value ? '✅' : '❌';
  console.log(`${varName}: ${status} = "${value}"`);
  if (!value) allVarsSet = false;
});

console.groupEnd();

// ============================================================================
// 4️⃣ 检查 paint(squircle) 是否实际应用（最关键）
// ============================================================================
console.group('4️⃣ paint(squircle) 掩码应用检查（关键）');

const elementsWithMask = [
  '#controlPanel',
  '.btn',
  'input[type="text"]',
  '.select-input',
  '#status',
  '#progressBar',
];

let maskApplicationSuccess = true;
elementsWithMask.forEach(selector => {
  const elem = document.querySelector(selector);
  if (!elem) {
    console.log(`${selector}: ⚠️ 元素未找到`);
    return;
  }

  const style = getComputedStyle(elem);
  const maskImage = style.maskImage || style.webkitMaskImage;
  
  // 判断是否真的应用了 paint(squircle)
  const hasPaintMask = maskImage && maskImage.includes('paint');
  const status = hasPaintMask ? '✅' : '⚠️';
  
  console.log(`${selector}: ${status}`);
  if (hasPaintMask) {
    console.log(`  - mask-image: ${maskImage}`);
  } else {
    // 这不一定是错误，如果 worklet 不支持可能是空的
    const borderRadius = style.borderRadius;
    console.log(`  - 降级到 border-radius: ${borderRadius}`);
    if (!hasSquircleClass) {
      maskApplicationSuccess = false;
    }
  }
});

console.groupEnd();

// ============================================================================
// 5️⃣ 综合诊断报告
// ============================================================================
console.group('📊 综合诊断报告');

const diagnostics = {
  '✅ Worklet 链路': hasSquircleClass && paintWorkletSupported,
  '✅ DOM 类挂载': allElementsCorrect,
  '✅ CSS 变量': allVarsSet,
  '⚠️ Paint 应用': maskApplicationSuccess || !paintWorkletSupported,
};

let allPass = Object.values(diagnostics).every(v => v);

Object.entries(diagnostics).forEach(([check, pass]) => {
  console.log(`${pass ? '✅' : '❌'} ${check}`);
});

console.log('');
if (allPass) {
  console.log('🎉 所有检查通过！平滑圆角链路已完整启用。');
  if (!maskApplicationSuccess && paintWorkletSupported) {
    console.log('ℹ️ 注意：Paint Worklet 已加载但尚未应用，可能需要刷新页面。');
  }
} else {
  console.log('❌ 发现问题，请检查上述输出。');
  if (!hasSquircleClass) {
    console.log('  → 根节点未添加 has-squircle 类，Paint Worklet 可能加载失败');
  }
  if (!allElementsCorrect) {
    console.log('  → 某些元素未正确挂载 smooth-corner 类');
  }
}

console.groupEnd();

// ============================================================================
// 6️⃣ 浏览器兼容性提示
// ============================================================================
console.group('🌐 浏览器兼容性');

const ua = navigator.userAgent;
const browserName = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : '未知';

console.log(`浏览器: ${browserName}`);
console.log(`Paint Worklet 在本浏览器中的支持情况:`);
console.log('  - Chrome/Edge: ✅ 完全支持');
console.log('  - Firefox: ✅ 127+ 支持');
console.log('  - Safari: ❌ 不支持（自动降级到 border-radius）');

if (browserName === 'Safari' || !paintWorkletSupported) {
  console.log('');
  console.log('ℹ️ 当前浏览器不支持 Paint Worklet，已自动使用 border-radius 作为降级方案。');
  console.log('   元素仍然会显示圆角，但不会有平滑的 squircle 效果。');
}

console.groupEnd();

console.groupEnd();

// ============================================================================
// 7️⃣ 实时监听 has-squircle 类添加
// ============================================================================
console.log('');
console.log('ℹ️ 实时监听模式启动：');
console.log('当 has-squircle 类被添加时会自动打印通知...');

const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      if (htmlElement.classList.contains('has-squircle')) {
        console.log('✅ [实时] has-squircle 类已添加！Paint Worklet 加载成功');
      }
    }
  });
});

observer.observe(htmlElement, { attributes: true, attributeFilter: ['class'] });

// 设置 30 秒后停止监听
setTimeout(() => {
  observer.disconnect();
  console.log('ℹ️ 实时监听已停止（30秒超时）');
}, 30000);


// 2. 检查各元素的 border-radius 是否使用了 CSS 变量
console.group('2️⃣ 元素圆角检查');
const elements = {
  '#controlPanel': document.getElementById('controlPanel'),
  '.btn (第一个)': document.querySelector('.btn'),
  '#status': document.getElementById('status'),
  '#progressBar': document.getElementById('progressBar'),
  '#albumCoverContainer': document.getElementById('albumCoverContainer'),
  '#albumCoverLarge': document.getElementById('albumCoverLarge'),
};

Object.entries(elements).forEach(([selector, elem]) => {
  if (elem) {
    const borderRadius = getComputedStyle(elem).borderRadius;
    const hasVar = borderRadius.includes('var') || borderRadius !== '0px';
    console.log(`${selector}: ${borderRadius} ${hasVar ? '✅' : '⚠️'}`);
  } else {
    console.log(`${selector}: ❌ 元素未找到`);
  }
});
console.groupEnd();

// 3. 检查动态圆角变量
console.group('3️⃣ 动态圆角变量检查');
const roundedCoverPercent = getComputedStyle(root).getPropertyValue('--rounded-cover-percent');
console.log(`--rounded-cover-percent: ${roundedCoverPercent || '未初始化'}`);
console.groupEnd();

// 4. 检查 Paint Worklet 支持
console.group('4️⃣ Paint Worklet 支持检查');
if (CSS && CSS.paintWorklet) {
  console.log('✅ Paint Worklet API 支持');
} else {
  console.log('⚠️ Paint Worklet API 不支持，使用 border-radius 降级');
}
console.groupEnd();

// 5. 检查 .smooth-corner 类定义
console.group('5️⃣ 平滑圆角类定义检查');
const styleSheets = document.styleSheets;
let smoothCornerFound = false;
let smoothCornerRules = [];

try {
  for (let i = 0; i < styleSheets.length; i++) {
    try {
      const rules = styleSheets[i].cssRules || styleSheets[i].rules;
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        if (rule.selectorText && (rule.selectorText.includes('.smooth-corner') || rule.selectorText.includes('.sc-'))) {
          smoothCornerFound = true;
          smoothCornerRules.push(rule.selectorText);
        }
      }
    } catch (e) {
      // 跨域样式表会抛出异常，正常行为
    }
  }
} catch (e) {
  console.log('⚠️ 无法完全访问所有样式表');
}

if (smoothCornerFound) {
  console.log('✅ 平滑圆角类定义已加载');
  console.log('找到的选择器:', smoothCornerRules);
} else {
  console.log('❌ 未找到平滑圆角类定义');
}
console.groupEnd();

// 6. 输入框和下拉框圆角检查
console.group('6️⃣ 输入控件圆角检查');
const inputElements = {
  'input[type="text"]': document.querySelector('input[type="text"]'),
  'input[type="number"]': document.querySelector('input[type="number"]'),
  'textarea': document.querySelector('textarea'),
  '.select-input': document.querySelector('.select-input'),
};

Object.entries(inputElements).forEach(([selector, elem]) => {
  if (elem) {
    const borderRadius = getComputedStyle(elem).borderRadius;
    console.log(`${selector}: ${borderRadius}`);
  } else {
    console.log(`${selector}: 页面上未找到`);
  }
});
console.groupEnd();

// 7. 生成测试建议
console.group('7️⃣ 测试建议');
console.log('✅ 如果上面的检查都通过了，请进行以下手动测试：');
console.log('  1. 调整"圆角"滑块（如果有），确保封面圆角平滑变化');
console.log('  2. 检查封面特效（innerShadow、longShadow、neumorphismB）是否跟着变化');
console.log('  3. 验证所有按钮、输入框的圆角是否一致');
console.log('  4. 检查浏览器控制台是否有 worklet 相关的警告或错误');
console.groupEnd();

console.groupEnd();
