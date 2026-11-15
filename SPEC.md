# SPEC

输入 Vite manifest JSON 及 Workbox JSON 数组或 JavaScript 中静态字面量 `precacheAndRoute` 调用；不执行代码。Vite `imports`、`dynamicImports`、`file`、`css`、`assets` 构图，静态路径优先于动态路径，缺失引用保留警告。按完整路径匹配，查询参数不参与匹配；外域和无法静态确定的 URL 标为未知。报告仅对清单已知条目分类；不推测实际请求、体积、文件安全性。限制输入文件各 5 MiB；错误需明确显示。合成示例包括 shell、lazy chunk、无已知引用的 wasm 和未知 URL。验证自动测试、构建及浏览器使用；仓库 MIT，静态部署。

开发提示词：阅读 PRD.md 和 SPEC.md，保持纯浏览器输入处理，完成上述分类与真实引用链，禁止执行用户代码。运行测试与构建，验证线上页面，准确记录限制。
