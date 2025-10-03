<img width="192" height="192" alt="logo" src="./public/icons/icon-192x192.png" />

# AMLL 网页播放器

## 快速开始

### 环境要求

- **Node.js**: 18.0+
- **浏览器**: Chromium 120+, Firefox 100+ (不推荐), Safari 15.4+

## 安装与运行

```
pnpm install
pnpm dev
```

## 构建与预览

```
pnpm build
pnpm preview
```

## 使用指南

### 输入方式

1. **本地文件上传**
   - 音频文件:
   - - 首次点击或右键或长按(3秒)播放按钮选择
   - - 拖拽到封面图选择
   - 歌词文件:
   - - 右键或长按(3秒)全屏按钮选择
   - - 拖拽到右侧歌词播放区域选择
   - 封面图片 (可选): 首次点击或右键或长按(3秒)拖拽封面选择
   - 艺术家: 首次点击或右键或长按(3秒)编辑
   - 歌曲标题: 首次点击或右键或长按(3秒)编辑

   所有上述选项都可以通过点击歌曲信息进入控制面板进行初始化。

2. **URL 参数 (API)**

   基础 URL: `https://amlw.vercel.app/`

   您可以通过 URL 参数直接加载音乐、歌词和封面图片:

   ```
   https://amlw.vercel.app/?music=音乐链接&lyric=歌词链接&cover=封面链接&title=歌曲名&artist=艺术家
   ```

   | 参数 | 类型 | 范围 | 默认值 | 描述 |
   | - | - | - | - | - |
   | `music` | 字符串 | URL | | 音频文件 |
   | `lyric` | 字符串 | URL | | 歌词文件 |
   | `cover` | 字符串 | URL | | 封面图片 URL |
   | `title` | 字符串 | 文本 | `Unknown Song` | 歌曲标题 |
   | `artist` | 字符串 | 文本 | `Unknown Artist` | 艺术家名称 |
   | `auto` | 布尔值 | 0 / 1 | `1` | 加载后自动播放 (1 = 启用)，可能因浏览器限制而不工作 |
   | `loop` | 布尔值 | 0 / 1 | `1` | 循环播放 (1 = 启用) |
   | `x` | 数字 | 0.10-4.00 | `1` | 播放速度 (x)，可能因浏览器限制而不工作 |
   | `ms` | 数字 | ±Num | `0` | 歌词延迟毫秒数 (ms) |
   | `vol` | 数字 | 0-100 / 0-1 | `50` /`0.5` | 音量百分比 (%)|
   | `t` | 数字 | Num | `0` | 开始播放位置秒数 (s) |
   | `te` | 数字 | Num | `0` | 结束播放位置秒数 (s) |

### 快捷键

- `Space`: 播放/暂停
- `左/右箭头`: 快进/快退 (10秒)
- `F`: 切换全屏
- `H`: 切换控制面板

## 许可证

This project is licensed under AGPL - see [LICENSE](LICENSE) for details.

## 致谢
- [apoint123/lyrics_helper_rs](https://github.com/apoint123/lyrics_helper_rs)
- [fred913/justlyrics](https://github.com/fred913/justlyrics)
- [ionic-team/ionicons](https://github.com/ionic-team/ionicons)
- [Steve-xmh/applemusic-like-lyrics](https://github.com/Steve-xmh/applemusic-like-lyrics)
- [tabler/tabler-icons](https://github.com/tabler/tabler-icons)

⭐ 如果您觉得这个项目有用，请给它一个星标！