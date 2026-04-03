/**
 * 平滑圆角系统验证脚本
 * 在浏览器开发工具的 Console 中运行此脚本来验证所有改动
 */

console.group('平滑圆角系统验证');

// 1. 检查 CSS 变量是否存在
console.group('1️⃣ CSS 变量检查');
const root = document.documentElement;
const cssVars = {
  '--sc-smooth': root.style.getPropertyValue('--sc-smooth') || getComputedStyle(root).getPropertyValue('--sc-smooth'),
  '--sc-card': root.style.getPropertyValue('--sc-card') || getComputedStyle(root).getPropertyValue('--sc-card'),
  '--sc-panel': root.style.getPropertyValue('--sc-panel') || getComputedStyle(root).getPropertyValue('--sc-panel'),
  '--sc-control': root.style.getPropertyValue('--sc-control') || getComputedStyle(root).getPropertyValue('--sc-control'),
  '--sc-cover': root.style.getPropertyValue('--sc-cover') || getComputedStyle(root).getPropertyValue('--sc-cover'),
};

Object.entries(cssVars).forEach(([key, value]) => {
  console.log(`${key}: ${value || '❌ 未定义'}`);
});
console.groupEnd();

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
