# 应用图标

将应用图标文件放置在此目录：

- `32x32.png` - 32x32 像素 PNG 图标
- `128x128.png` - 128x128 像素 PNG 图标  
- `128x128@2x.png` - 256x256 像素 PNG 图标（高分辨率）
- `icon.icns` - macOS 图标文件
- `icon.ico` - Windows 图标文件

你可以使用在线工具生成这些图标，或使用 Tauri 的图标生成工具：

```bash
npm install --save-dev @tauri-apps/cli
npx tauri icon path/to/your/icon.png
```

在有合适的图标之前，应用将使用默认图标。

