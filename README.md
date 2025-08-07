 <img width="106" height="106" alt="logo" src="https://github.com/user-attachments/assets/d905bb3b-ad10-4e90-bb84-8f61d33ae5eb" />
 
# 一个AMLL歌词播放器


##  快速开始

### 环境要求

- **Node.js**: 18.0+
- **浏览器**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

## 安装和运行

### 安装依赖
```
pnpm install
```

### 启动开发服务器
```
pnpm dev
```

### 外部访问
```
pnpm dev --host
```
## 构建

### 构建项目
```
pnpm build
```

### 预览构建结果
```
pnpm preview
```

##  使用说明

### 输入方式

1. **本地文件上传**
   - 音频文件
   - 歌词文件
   - 封面图片（可选）

2. **URL参数**
   ```
   https://amllp.bikonoo.com/?music=音乐链接&lyric=歌词链接&cover=封面链接&title=歌曲名&artist=艺术家
   ```

### 快捷键

- `空格键` - 播放/暂停
- `左右箭头` - 快进/快退（10秒）
- `F` - 全屏切换


## 部署

### 静态部署

构建项目
```
pnpm build
```
将dist目录部署到Web服务器

## 许可证

本项目采用AGPL许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 致谢

- [Steve-xmh/applemusic-like-lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics)

⭐ 如果这个项目对您有帮助，请给我一个星标！
