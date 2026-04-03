// Squircle Paint Worklet - 连续曲率的超椭圆形 (Superellipse)
// 基于 Figma 的 squircle 设计实现
// 参考: https://figma.com/blog/how-figmas-multiplayer-technology-works/

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

    // 将百分比转换为像素（如果是百分比）
    if (radiusStr.includes('%')) {
      radius = (Math.min(width, height) / 2) * (radius / 100);
    }

    // 确保 radius 不超过容器的一半
    radius = Math.min(radius, Math.min(width, height) / 2);

    // smooth 值应该在 0.5 到 1 之间（0.5=完全矩形，1=完全圆形）
    smooth = Math.max(0.5, Math.min(1, smooth));

    // 绘制 squircle
    this.drawSquircle(ctx, width, height, radius, smooth);

    // 填充白色（用于 mask-image）
    ctx.fillStyle = 'white';
    ctx.fill();
  }

  drawSquircle(ctx, width, height, radius, smooth) {
    ctx.beginPath();

    const x = 0;
    const y = 0;

    // 根据 smooth 参数调整曲率
    // smooth = 1 时接近圆形，smooth = 0.5 时接近矩形
    const controlMultiplier = (4 / 3) * Math.tan(Math.PI / (4 * smooth));

    // 绘制四个象限，每个象限使用 Bézier 曲线
    const steps = 20; // 每个角的曲线分段数

    // 右上角
    for (let i = 0; i <= steps; i++) {
      const angle = (Math.PI / 2) * (i / steps);
      const px = radius + (width - 2 * radius) * Math.pow(Math.cos(angle), 2 / smooth);
      const py = radius * (1 - Math.pow(Math.sin(angle), 2 / smooth));
      
      if (i === 0) {
        ctx.moveTo(x + width - radius, y);
      } else {
        const prevAngle = (Math.PI / 2) * ((i - 1) / steps);
        const prevPx = radius + (width - 2 * radius) * Math.pow(Math.cos(prevAngle), 2 / smooth);
        const prevPy = radius * (1 - Math.pow(Math.sin(prevAngle), 2 / smooth));
        ctx.lineTo(x + px, y + py);
      }
    }

    // 右下角
    for (let i = 0; i <= steps; i++) {
      const angle = (Math.PI / 2) * (i / steps);
      const px = radius + (width - 2 * radius) * Math.pow(Math.sin(angle), 2 / smooth);
      const py = height - radius * (1 - Math.pow(Math.cos(angle), 2 / smooth));
      
      ctx.lineTo(x + px, y + py);
    }

    // 左下角
    for (let i = 0; i <= steps; i++) {
      const angle = (Math.PI / 2) * (i / steps);
      const px = radius - (width - 2 * radius) * Math.pow(Math.cos(angle), 2 / smooth);
      const py = height - radius * (1 - Math.pow(Math.sin(angle), 2 / smooth));
      
      ctx.lineTo(x + px, y + py);
    }

    // 左上角
    for (let i = 0; i <= steps; i++) {
      const angle = (Math.PI / 2) * (i / steps);
      const px = radius - (width - 2 * radius) * Math.pow(Math.sin(angle), 2 / smooth);
      const py = radius * (1 - Math.pow(Math.cos(angle), 2 / smooth));
      
      ctx.lineTo(x + px, y + py);
    }

    ctx.closePath();
  }
}

registerPaint('squircle', SquirclePainter);
