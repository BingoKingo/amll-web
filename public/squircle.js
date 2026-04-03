// Squircle Paint Worklet - 超椭圆形 (Superellipse) 的可靠实现
// 基于 Bézier 曲线的光滑连续路径构造
// 参考: Figma's squircle design & Piet Poortinga's research

class SquirclePainter {
  static get inputProperties() {
    return ['--squircle-radius', '--squircle-smooth'];
  }

  paint(ctx, size, properties) {
    const width = size.width;
    const height = size.height;
    const radiusStr = properties.get('--squircle-radius').toString().trim();
    const smoothStr = properties.get('--squircle-smooth').toString().trim();

    // 解析 CSS 变量
    let radius = parseFloat(radiusStr);
    let smooth = parseFloat(smoothStr);

    // 默认值
    if (isNaN(radius)) radius = 20;
    if (isNaN(smooth)) smooth = 0.9;

    // 将百分比转换为像素
    if (radiusStr.includes('%')) {
      radius = (Math.min(width, height) / 2) * (radius / 100);
    }

    // 确保 radius 不超过容器的一半
    radius = Math.min(radius, Math.min(width, height) / 2);

    // smooth 值应该在 0.5 到 1 之间
    smooth = Math.max(0.5, Math.min(1, smooth));

    // 绘制 squircle 路径
    this.drawSquircle(ctx, width, height, radius, smooth);

    // 填充白色（用于 mask-image）
    ctx.fillStyle = 'white';
    ctx.fill();
  }

  drawSquircle(ctx, width, height, radius, smooth) {
    ctx.beginPath();

    // squircle 是一个 4 折对称的超椭圆形，具有连续的曲率
    // 使用参数化方程：
    // x = r + (w - 2r) * cos^(2/p) θ
    // y = r + (h - 2r) * sin^(2/p) θ
    // 其中 p 是曲率参数（p越接近1，形状越接近圆角矩形）

    const curvePoint = (t, width, height, radius, power) => {
      const ps = 2 / power;
      const x = radius + (width - 2 * radius) * Math.pow(Math.max(0, Math.cos(t)), ps);
      const y = radius + (height - 2 * radius) * Math.pow(Math.max(0, Math.sin(t)), ps);
      return { x, y };
    };

    // 使用三次贝塞尔曲线分段绘制圆角
    // 每个象限分成多段以确保平滑性
    const segments = 40; // 每个象限的段数
    const angleStart = 0;

    // 第一象限：从右上 (width - radius, 0) 到右下 (width, radius)
    let prevX = width - radius;
    let prevY = 0;
    ctx.moveTo(prevX, prevY);

    for (let i = 1; i <= segments; i++) {
      const angle = (Math.PI / 2) * (i / segments);
      const pt = curvePoint(angle, width, height, radius, smooth);
      
      // 使用直线连接以保证路径连续性（贝塞尔会造成路径错乱）
      ctx.lineTo(pt.x, pt.y);
      prevX = pt.x;
      prevY = pt.y;
    }

    // 第二象限：从右下角 (width, height - radius) 到左下角 (radius, height)
    for (let i = 1; i <= segments; i++) {
      const angle = Math.PI / 2 + (Math.PI / 2) * (i / segments);
      const pt = curvePoint(angle, width, height, radius, smooth);
      ctx.lineTo(pt.x, pt.y);
    }

    // 第三象限：从左下角 (0, height - radius) 到左上角 (0, radius)
    for (let i = 1; i <= segments; i++) {
      const angle = Math.PI + (Math.PI / 2) * (i / segments);
      const pt = curvePoint(angle, width, height, radius, smooth);
      ctx.lineTo(pt.x, pt.y);
    }

    // 第四象限：从左上角 (0, radius) 回到起点 (width - radius, 0)
    for (let i = 1; i <= segments; i++) {
      const angle = (3 * Math.PI / 2) + (Math.PI / 2) * (i / segments);
      const pt = curvePoint(angle, width, height, radius, smooth);
      ctx.lineTo(pt.x, pt.y);
    }

    // 闭合路径
    ctx.closePath();
  }
}

registerPaint('squircle', SquirclePainter);

