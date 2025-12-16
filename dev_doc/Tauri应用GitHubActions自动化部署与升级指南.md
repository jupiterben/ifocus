## Tauri应用GitHubActions自动化部署与升级指南

### 一、前言

本文详细介绍如何利用 GitHub Actions 实现 Tauri 应用的[自动化构建](https://so.csdn.net/so/search?q=%E8%87%AA%E5%8A%A8%E5%8C%96%E6%9E%84%E5%BB%BA&spm=1001.2101.3001.7020)、发布及通过 UpgradeLink 实现应用自动更新功能。通过本指南，你将学会配置  
GitHub Actions [工作流](https://so.csdn.net/so/search?q=%E5%B7%A5%E4%BD%9C%E6%B5%81&spm=1001.2101.3001.7020)，完成从代码提交到应用更新的全自动化流程。

### 二、核心工具介绍

#### 1\. Tauri 官方 GitHub Action

Tauri 官方提供的 GitHub Action 插件，可帮助开发者在 GitHub Actions 环境中自动构建、打包并发布 Tauri 应用到 GitHub  
Releases。

- [官方文档](https://tauri.app/zh-cn/distribute/pipelines/github/)

#### 2\. UpgradeLink GitHub Action

UpgradeLink 提供的 GitHub Action 插件，用于将 Tauri 应用生成的更新文件（latest.json）上传至 UpgradeLink 服务器，  
UpgradeLink 读取json文件中应用文件的地址，保存文件，自动实现应用版本文件的创建，和对应升级策略的创建。

- [项目地址](https://github.com/toolsetlink/upgradelink-action)

#### 3.已经跑完全部流程的示例项目

流程的示例项目

- [示例项目 tauri-demo](https://github.com/toolsetlink/tauri-demo)

### 三、工作流说明

工作流分为两个主要作业：

1.  **publish-tauri**：构建并发布 Tauri 应用到 GitHub Releases

    - 跨平台构建：同时支持 macOS、Linux 和 Windows
    - 版本号提取：从 Tauri 构建输出中提取应用版本号
    - 发布管理：自动创建 GitHub Release 并上传应用安装包

2.  **upgradeLink-upload**：将更新信息同步到 UpgradeLink

    - 依赖关系：等待 publish-tauri 作业完成
    - 版本感知：通过输出参数获取应用版本号
    - API 调用：使用 UpgradeLink Action 将 latest.json 上传至升级服务器

### 四、接入步骤详解

#### 1\. 前期准备

首先需要确保：

- 已创建 GitHub 仓库并上传 Tauri 应用代码
- 拥有 UpgradeLink 平台的账号并获取以下凭证：
  - ACCESS_KEY（访问密钥） [密钥信息](https://www.toolsetlink.com/upgrade/recommend/secret/secret.html)
  - TAURI_KEY（应用唯一标识） [应用信息](https://www.toolsetlink.com/upgrade/recommend/tauri/app.html)
- 在 UpgradeLink平台的 tauri 应用配置中，配置上 github 仓库的地址。

#### 2\. 配置 GitHub Secrets

在 GitHub 仓库的 Settings > Security > Secrets and variables > Actions 中添加以下加密环境变量：

| Secret 名称                        | 说明                                                  |
| ---------------------------------- | ----------------------------------------------------- |
| UPGRADE_LINK_ACCESS_KEY            | UpgradeLink 平台提供的访问密钥，用于 API 调用身份验证 |
| UPGRADE_LINK_TAURI_KEY             | UpgradeLink 平台为你的 Tauri 应用分配的唯一标识       |
| TAURI_SIGNING_PRIVATE_KEY          | Tauri 应用签名私钥（如需要代码签名）                  |
| TAURI_SIGNING_PRIVATE_KEY_PASSWORD | 签名私钥密码（如设置）                                |

#### 3\. 建议先使用 Tauri 官方提供的 tauri-action 进行测试，确保能够正常构建和发布Releases版本。

因为使用 tauri-action 这一套流程里，会遇到各种权限等问题，需要给前期跑通流程。

#### 4\. 修改官方默认提供的配置信息

[官方提供的示例工作流](https://tauri.app/zh-cn/distribute/pipelines/github/#example-workflow)

基于官方提供的示例 做出以下修改

```markdown
name: 'publish'

on:
push:
branches: - main

jobs:
publish-tauri: # 添加输出定义
outputs:
appVersion: ${{ steps.set_output.outputs.appVersion }}

    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-24.04'
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9
          run_install: true

      - name: setup node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: 'pnpm'

      - name: install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: install dependencies (ubuntu only)
        if: matrix.platform == 'ubuntu-24.04'
        run: |
          sudo apt-get update
          sudo apt-get install pkg-config libclang-dev libxcb1-dev libxrandr-dev libdbus-1-dev libpipewire-0.3-dev libwayland-dev libegl-dev libglib2.0-dev libgtk-3-dev libwebkit2gtk-4.1-dev libgbm-dev libappindicator3-dev librsvg2-dev patchelf

      - name: install frontend dependencies
        run: pnpm install

      - uses: tauri-apps/tauri-action@v0
        id: tauri-action  # 添加 id 以便后续引用
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: tauri-demo-v__VERSION__
          releaseName: 'tauri-demo v__VERSION__'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: false # 不创建草稿版本
          prerelease: false # 不作为预发布版本
          args: ${{ matrix.args }}

      # 增加获取版本号
      - name: Generate release tag
        id: save_tag
        if: matrix.platform == 'ubuntu-24.04'
        run: |
          # 调试输出
          echo ${{ steps.tauri-action.outputs.appVersion }}
          # 输出到步骤级
          echo "appVersion=${{ steps.tauri-action.outputs.appVersion }}" >> $GITHUB_OUTPUT

      # 设置作业级输出
      - name: Set job output
        id: set_output
        if: matrix.platform == 'ubuntu-24.04'
        run: |
          # 注意：这里引用的是 save_tag 步骤的 tag_name 输出
          echo "appVersion=${{ steps.save_tag.outputs.appVersion }}" >> $GITHUB_OUTPUT

upgradeLink-upload:
needs: publish-tauri # 依赖于 publish-tauri作业完成
permissions:
contents: write
runs-on: ubuntu-latest
steps: - name: Send a request to UpgradeLink
uses: toolsetlink/upgradelink-action@v5
with:
source-url: 'https://github.com/toolsetlink/tauri-demo/releases/download/tauri-demo-v${{ needs.publish-tauri.outputs.appVersion }}/latest.json'
access-key: ${{ secrets.UPGRADE_LINK_ACCESS_KEY }} # ACCESS_KEY 密钥key
tauri-key: ${{ secrets.UPGRADE_LINK_TAURI_KEY }} # TAURI_KEY tauri 应用唯一标识
github-token: ${{ secrets.GITHUB_TOKEN }}
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384858687888990919293949596979899100101102
```

##### 1\. 添加输出定义，目的为了后续获取到 tauri 应用的版本号，方便后续上传到 UpgradeLink 系统。

```markdown
publish-tauri: # 添加输出定义
outputs:
appVersion: ${{ steps.set_output.outputs.appVersion }}
1234
```

##### 2\. 给 tauri-apps/tauri-action@v0 添加id，调整 releaseDraft 与 prerelease字段。

```markdown
- uses: tauri-apps/tauri-action@v0
  id: tauri-action # 添加 id 以便后续引用
  env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
  with:
  tagName: tauri-demo-v**VERSION**
  releaseName: 'tauri-demo v**VERSION**'
  releaseBody: 'See the assets to download this version and install.'
  releaseDraft: false # 不创建草稿版本
  prerelease: false # 不作为预发布版本
  args: ${{ matrix.args }}
  12345678910111213
```

##### 3\. 在 publish-tauri 任务下 增加获取版本号与输出版本号

```markdown
# 增加获取版本号

- name: Generate release tag
  id: save_tag
  if: matrix.platform == 'ubuntu-24.04'
  run: |
  # 调试输出
  echo ${{ steps.tauri-action.outputs.appVersion }}
  # 输出到步骤级
  echo "appVersion=${{ steps.tauri-action.outputs.appVersion }}" >> $GITHUB_OUTPUT

# 设置作业级输出

- name: Set job output
  id: set_output
  if: matrix.platform == 'ubuntu-24.04'
  run: |
  # 注意：这里引用的是 save_tag 步骤的 tag_name 输出
  echo "appVersion=${{ steps.save_tag.outputs.appVersion }}" >> $GITHUB_OUTPUT
  1234567891011121314151617
```

##### 4\. 引入 upgradelink-action模块。替换对应的信息

```markdown
upgradeLink-upload:
needs: publish-tauri # 依赖于 publish-tauri作业完成
permissions:
contents: write
runs-on: ubuntu-latest
steps: - name: Send a request to UpgradeLink
uses: toolsetlink/upgradelink-action@v5
with:
source-url: 'https://github.com/toolsetlink/tauri-demo/releases/download/tauri-demo-v${{ needs.publish-tauri.outputs.appVersion }}/latest.json'
access-key: ${{ secrets.UPGRADE_LINK_ACCESS_KEY }} # ACCESS_KEY 密钥key
tauri-key: ${{ secrets.UPGRADE_LINK_TAURI_KEY }} # TAURI_KEY tauri 应用唯一标识
github-token: ${{ secrets.GITHUB_TOKEN }}
12345678910111213
```

### 五、常见问题与解决方案

#### 1\. GitHub Actions 权限问题

如果遇到权限不足错误，请确保：

- 工作流文件中配置了 `permissions: contents: write`
- 仓库设置中 Actions 权限已正确配置

#### 2\. 构建失败排查

- 检查 GitHub Actions 日志，查看具体错误信息
- 确认所有依赖已正确安装，特别是 Linux 平台的系统依赖
- 确保 Rust 和 Node.js 版本兼容

#### 3\. UpgradeLink 集成问题

- 检查 UpgradeLink 控制台中的应用标识是否与配置一致
- 确认 GitHub Releases 中是否生成了正确的 latest.json 文件

### 六、总结

通过以上配置，你可以实现 Tauri 应用的全自动化构建、发布和更新流程。每当代码推送到指定分支时，GitHub Actions 将自动完成以下工作：

1.  检测代码变更
2.  在多平台环境中构建 Tauri 应用
3.  创建 GitHub Release 并上传安装包
4.  提取应用版本号
5.  将更新信息同步到 UpgradeLink 平台
6.  最终用户将通过 UpgradeLink 收到应用更新通知

这种自动化流程大大提高了开发效率，减少了手动操作错误，让开发者可以更专注于应用功能开发。
