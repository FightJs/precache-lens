# Precache Lens

**代码按需加载了，为什么安装 PWA 时还是看到了它？**

Vite 可以把编辑器、设置页等功能拆成动态 chunk；与此同时，Workbox 的预缓存清单也可能包含这些文件。Service Worker 安装时，预缓存过程会处理清单中的资源，因此「业务代码尚未执行动态导入」不一定意味着「安装阶段不会处理这个文件」。

Precache Lens 把 **Vite 构建 manifest** 与 **Workbox 预缓存清单**放在一起看，标出静态可达、仅动态可达和没有已知 Vite 引用的条目，并展示找到的引用路径。文件在浏览器本地读取，不会上传，也不会执行 Service Worker 代码。

**[打开在线工具](https://fightjs.github.io/precache-lens/)** · [用自己的构建产物](#用自己的构建产物) · [理解结果](#理解结果) · [支持范围与局限](#支持范围与局限)

## 先看内置示例

[打开页面](https://fightjs.github.io/precache-lens/)即可看到一组**合成数据**，不需要提供项目源码：

| 预缓存条目 | 工具显示 | 解释 |
| --- | --- | --- |
| `assets/app-A1.js` | Static entry path | 从入口静态可达 |
| `assets/shared-B2.js`、`assets/app-C3.css` | Static entry path | 入口通过静态引用到达共享模块及其 CSS |
| `assets/editor-D4.js` | Dynamic path | 从入口经动态导入到达，但也出现在预缓存清单中 |
| `assets/model.wasm` | No known Vite link | 在已遍历的 manifest 中没有找到匹配的引用 |
| `https://cdn.example.com/runtime.js` | Uncertain | 外部 URL 不做保守路径匹配 |

对这个例子，页面显示 **3 个静态路径、1 个动态路径、1 个无已知引用、1 个不确定**。`editor` 的结果是一个检查离线策略的线索，不代表配置有错：为了离线体验主动预缓存它可能完全合理。`model.wasm` 也不能仅凭这份报告判定为可删除。

## 用自己的构建产物

### 1. 生成 Vite manifest

在 Vite 配置中开启 manifest，再执行项目自己的构建命令：

```js
// vite.config.js / vite.config.ts
export default {
  build: {
    manifest: true
  }
}
```

默认构建设置下，文件通常位于 `dist/.vite/manifest.json`。如果项目已有 Vite 配置，把 `manifest: true` 合并到现有的 `build` 配置中即可；实际位置以你的构建配置为准。

### 2. 找到 Workbox 预缓存清单

第二个输入支持两种形式：

**JSON 数组**，每项可以是 URL 字符串，也可以是带 `url` 的对象：

```json
[
  "assets/app-A1.js",
  { "url": "assets/editor-D4.js", "revision": null }
]
```

或者，选择包含一个静态字面量数组调用的 JavaScript 文件，例如：

```js
precacheAndRoute([
  { url: 'assets/app-A1.js', revision: null },
  { url: 'assets/editor-D4.js', revision: null }
])
```

工具只解析语法，不运行文件。它支持独立调用以及 `workbox.precacheAndRoute([...])` 形式的成员调用；JavaScript 中必须恰好找到一个这样的调用，且第一个参数必须是数组字面量。计算得到的数组会被拒绝；数组中的动态条目、动态 URL、展开属性或可能覆盖 URL 的写法会被标为不确定。自定义 Service Worker 逻辑、其他注入形式和任意 JavaScript 程序不在支持范围内。

### 3. 选择文件并查看引用路径

在页面分别选择 manifest 和清单；两者齐全后自动分析。每条结果显示 URL、分类，以及找到的入口到模块路径。每个输入文件上限为 **5 MiB**。选择 **Load example** 可清空文件选择并恢复合成示例。

如果需要判断浏览器实际下载了什么，请结合目标环境中的 Network 面板和 Service Worker 状态检查。浏览器缓存、安装时机和服务器行为都会影响实际请求；这份报告不测量请求数、文件大小或传输字节数。

## 理解结果

| 页面分类 | 含义 | 使用时要注意 |
| --- | --- | --- |
| **Static entry path** | 从 manifest 中的 `isEntry` 入口沿静态 `imports` 到达 | 若同时存在静态和动态路径，静态路径优先 |
| **Dynamic path** | 找到经过至少一次 `dynamicImports` 的路径，且未找到静态路径 | 已列入预缓存不等于配置错误 |
| **No known Vite link** | 在已遍历的 manifest 输出中没有找到匹配路径 | public 文件、运行时 URL 等可能不在图中；不能据此删除 |
| **Uncertain** | URL 无法保守匹配，或现有图不足以支持结论 | 包括外部/动态 URL、不完整图影响的结果，以及无法明确对应输出的 HTML 入口键 |

页面也会提示缺失入口或 manifest 引用。图不完整时，已有静态路径仍可展示；动态和未匹配条目会保守地标为不确定。

## 支持范围与局限

- 图只使用 manifest 的 `imports`、`dynamicImports`、`file`、`css` 和 `assets` 字段，不分析普通 JavaScript 中的引用，也不推断运行时拼接的 URL。
- 路径匹配会忽略查询参数和片段；其余部分需要匹配。外域 URL、反斜杠和含 `..` 路径段等情况不会被当作可靠匹配。
- 工具不会自动识别部署的 `base` 前缀。预缓存 URL 与 manifest 使用不同前缀时，即使它们指向同一文件，也可能无法匹配；请结合构建配置人工核对。
- manifest 未必覆盖 `public` 目录、手写引用或自定义 Service Worker 行为。「没有已知引用」只描述这份输入中的证据。
- 清单条目不等于成功的网络请求。工具不运行 Service Worker，不修改配置、不删除文件，也不判断资源是否应该离线缓存。
- 文件内容在本地处理，不发送到项目服务器；页面本身仍需加载应用资源。不要把报告当作完整依赖分析或安全审计。

## 本地运行

需要 Node.js 和 npm；项目的 GitHub Actions 使用 Node.js 22。首次安装依赖需要网络。

```bash
git clone https://github.com/FightJs/precache-lens.git
cd precache-lens
npm ci
npm run dev
```

打开终端输出的本地地址。运行测试和构建：

```bash
npm test        # 解析、引用图、边界与真实格式产物测试
npm run build   # 输出静态站点到 dist/
```

测试材料中包含由 **Vite 6.4.1** 和 **Workbox 7.3.0** 生成的合成构建产物，见 [test/fixtures](test/fixtures/workbox-7-vite-6/README.md)。它用于验证受支持的实际格式，并不代表所有版本或配置都能解析。

## 反馈与许可证

如果一份标准格式的清单无法解析，欢迎[提交 issue](https://github.com/FightJs/precache-lens/issues)，附上可公开的最小 manifest、清单、构建工具版本及预期结果。请先移除私有路径和不适合公开的内容。

本项目采用 [MIT License](LICENSE)。Vite、Acorn 等第三方依赖保留各自的许可证。
