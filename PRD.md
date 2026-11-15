# Precache Lens — 产品范围

为 Vite PWA 维护者解释：哪些按需模块会在安装 Service Worker 时预缓存，哪些预缓存 URL 没有已知 Vite 引用。内置合成案例展示这两种情况。分析在浏览器本地完成，不运行 Service Worker，不上传文件。

首版接受 Vite build manifest 和 Workbox precache 清单（JSON，或标准 `precacheAndRoute([...])` 静态字面量调用）。报告静态入口、动态可达、无已知引用及无法解析的条目，展示引用链；不判断文件是否可删除、是否应缓存，也不声称计算实际传输量。未覆盖运行时拼接 URL、public 目录的引用和自定义 SW 逻辑。五维旧评分对缩小范围待重新独立复核；增长未知。
