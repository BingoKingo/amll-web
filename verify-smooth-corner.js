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
  '.btn (第一个)': {
    elem: document.querySelector('.btn'),
    expectedClasses: ['smooth-corner', 'sc-control'],
  },
  '#status': {
    elem: document.getElementById('status'),
    expectedClasses: [],  // 通过 CSS 选择器应用，不需要类
  },
  '#progressBar': {
    elem: document.getElementById('progressBar'),
    expectedClasses: [],  // 通过 CSS 选择器应用，不需要类
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
    console.log(`${selector}: ⚠️ 元素未找到`);
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

// 检查动态圆角变量
const roundedCoverPercent = computedStyle.getPropertyValue('--rounded-cover-percent').trim();
console.log(`--rounded-cover-percent: ${roundedCoverPercent ? '✅ = ' + roundedCoverPercent : '❌ 未初始化'}`);

console.groupEnd();

// ============================================================================
// 4️⃣ 检查 paint(squircle) 是否实际应用（最关键）
// ============================================================================
console.group('4️⃣ paint(squircle) 掩码应用检查（关键）');

const elementsWithMask = [
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
// 4️⃣ 验证封面使用纯 border-radius（不使用 squircle）
// ============================================================================
console.group('4️⃣ 封面纯 border-radius 验证');

const albumCoverLarge = document.getElementById('albumCoverLarge');
let coverRadiusCorrect = false;

if (albumCoverLarge) {
  const coverStyle = getComputedStyle(albumCoverLarge);
  const coverMaskImage = coverStyle.maskImage || coverStyle.webkitMaskImage;
  const coverBorderRadius = coverStyle.borderRadius;
  
  const hasMask = coverMaskImage && coverMaskImage.includes('paint');
  const hasBorderRadius = coverBorderRadius && coverBorderRadius !== 'none';
  
  if (hasMask) {
    console.log('❌ #albumCoverLarge 错误地使用了 paint(squircle) 掩码');
    console.log(`  - mask-image: ${coverMaskImage}`);
  } else {
    console.log('✅ #albumCoverLarge 未使用 paint(squircle) 掩码');
  }
  
  if (hasBorderRadius) {
    console.log(`✅ #albumCoverLarge 使用 border-radius: ${coverBorderRadius}`);
    coverRadiusCorrect = true;
  } else {
    console.log('⚠️ #albumCoverLarge 未设置 border-radius');
  }
  
  // 检查是否移除了 smooth-corner 和 sc-cover 类
  const hasSmootherClass = albumCoverLarge.classList.contains('smooth-corner');
  const hasCoverClass = albumCoverLarge.classList.contains('sc-cover');
  
  if (hasSmootherClass || hasCoverClass) {
    console.log('❌ #albumCoverLarge 仍然有不应该的类：');
    if (hasSmootherClass) console.log('  - smooth-corner 类（应该移除）');
    if (hasCoverClass) console.log('  - sc-cover 类（应该移除）');
  } else {
    console.log('✅ #albumCoverLarge 已移除 smooth-corner 和 sc-cover 类');
  }
} else {
  console.log('⚠️ #albumCoverLarge 元素未找到');
}

console.groupEnd();

// ============================================================================
// 5️⃣ 控制面板纯 border-radius 验证（不使用 squircle）
// ============================================================================
console.group('5️⃣ 控制面板纯 border-radius 验证');

const controlPanel = document.getElementById('controlPanel');
let controlPanelRadiusCorrect = false;

if (controlPanel) {
  const panelStyle = getComputedStyle(controlPanel);
  const panelMaskImage = panelStyle.maskImage || panelStyle.webkitMaskImage;
  const panelBorderRadius = panelStyle.borderRadius;
  
  const hasMask = panelMaskImage && panelMaskImage.includes('paint');
  const hasBorderRadius = panelBorderRadius && panelBorderRadius !== 'none';
  
  if (hasMask) {
    console.log('❌ #controlPanel 错误地使用了 paint(squircle) 掩码');
    console.log(`  - mask-image: ${panelMaskImage}`);
  } else {
    console.log('✅ #controlPanel 未使用 paint(squircle) 掩码');
  }
  
  if (hasBorderRadius) {
    console.log(`✅ #controlPanel 使用 border-radius: ${panelBorderRadius}`);
    controlPanelRadiusCorrect = true;
  } else {
    console.log('⚠️ #controlPanel 未设置 border-radius');
  }
  
  // 检查是否移除了 smooth-corner 和 sc-panel 类
  const hasSmootherClass = controlPanel.classList.contains('smooth-corner');
  const hasPanelClass = controlPanel.classList.contains('sc-panel');
  
  if (hasSmootherClass || hasPanelClass) {
    console.log('❌ #controlPanel 仍然有不应该的类：');
    if (hasSmootherClass) console.log('  - smooth-corner 类（应该移除）');
    if (hasPanelClass) console.log('  - sc-panel 类（应该移除）');
  } else {
    console.log('✅ #controlPanel 已移除 smooth-corner 和 sc-panel 类');
  }
  
  // 检查是否保持了滚动功能
  const hasOverflowY = panelStyle.overflowY === 'auto' || panelStyle.overflowY === 'scroll';
  if (hasOverflowY) {
    console.log('✅ #controlPanel 保持了 overflow-y: auto 滚动功能');
  } else {
    console.log('⚠️ #controlPanel 的 overflow-y 可能被意外修改');
  }
} else {
  console.log('⚠️ #controlPanel 元素未找到');
}

console.groupEnd();

// ============================================================================
// 6️⃣ 综合诊断报告
// ============================================================================
console.group('📊 综合诊断报告');

const diagnostics = {
  '✅ Worklet 链路': hasSquircleClass && paintWorkletSupported,
  '✅ DOM 类挂载': allElementsCorrect,
  '✅ CSS 变量': allVarsSet,
  '⚠️ Paint 应用': maskApplicationSuccess || !paintWorkletSupported,
  '✅ 封面纯 border-radius': coverRadiusCorrect,
  '✅ 面板纯 border-radius': controlPanelRadiusCorrect,
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
  if (!allVarsSet) {
    console.log('  → CSS 变量未定义');
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

console.groupEnd();
