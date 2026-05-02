# CV Builder 运行文档

## 1. 文档目的

本文档说明如何在本地启动、测试和排查 CV Builder。

当前项目定位是本地单用户 MVP，不包含认证、多人协作或生产部署配置。

## 2. 环境要求

建议环境：

- macOS / Linux
- Python 3.13+
- Node.js 20+
- npm
- uv（推荐，用于后端依赖和测试）

可选：

- Google Chrome / Chromium：用于人工浏览器验证或真实 PDF 渲染。
- OpenAI API key：后续接入真实 AI 生成时需要；当前确定性 workflow 测试不需要。

## 3. 项目结构

```text
backend/    后端 FastAPI 服务
frontend/   前端 Vite React 应用
docs/       项目文档
```

## 4. 后端运行

### 4.1 使用 uv（推荐）

```bash
cd backend
uv run --extra dev pytest -v
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

后端默认地址：

```text
http://127.0.0.1:8000
```

健康检查：

```bash
curl http://127.0.0.1:8000/api/health
```

期望返回：

```json
{"status":"ok"}
```

### 4.2 使用 venv / pip

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
pytest -v
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 5. 前端运行

首次运行：

```bash
cd frontend
npm install
npm test
npm run dev
```

前端默认地址：

```text
http://127.0.0.1:5173
```

前端开发服务器会把 `/api` 代理到：

```text
http://127.0.0.1:8000
```

因此本地开发时通常需要同时启动：

1. 后端：`127.0.0.1:8000`
2. 前端：`127.0.0.1:5173`

## 6. 一键式本地验证流程

在项目根目录分别运行：

```bash
cd backend
uv run --extra dev pytest -v
```

```bash
cd ../frontend
npm install
npm test
npm run build
```

当前期望结果：

- 后端测试全部通过。
- 前端测试全部通过。
- 前端构建成功。
- Vite 可能提示 Ant Design bundle 超过 500 kB，这是当前非阻塞 warning。

## 7. 后端测试说明

后端测试位于：

```text
backend/tests/
```

覆盖范围包括：

- health endpoint
- Master CV API
- 本地 JSON storage
- Application API
- JD ingestion
- AI client boundary
- workflow skeleton
- PDF renderer
- export endpoint 安全边界
- end-to-end smoke path

运行全部测试：

```bash
cd backend
uv run --extra dev pytest -v
```

运行单个测试文件：

```bash
cd backend
uv run --extra dev pytest tests/test_e2e_smoke.py -v
```

## 8. 前端测试说明

前端测试位于：

```text
frontend/src/**/*.test.tsx
```

运行：

```bash
cd frontend
npm test
```

当前覆盖：

- 主导航是否渲染。
- Master CV editor 是否能加载 profile 字段。
- Save 按钮状态。
- 保存 payload 合并行为。
- 加载 / 保存失败提示。

## 9. 数据目录

后端本地运行数据默认写入：

```text
backend/data/
```

该目录用于保存：

```text
master_cv.json
applications/<application_id>/run.json
applications/<application_id>/exports/*.pdf
```

`backend/data/` 已被 `.gitignore` 忽略，不应提交。

如需清空本地数据，可停止后端后删除：

```bash
rm -rf backend/data
```

注意：这会删除本地 Master CV、application runs 和导出的 PDF。

## 10. AI Provider 配置

当前 MVP 默认模型是：

```text
OpenAI gpt-5.4
```

配置字段在：

```text
backend/app/config.py
```

默认 API key 环境变量名：

```text
OPENAI_API_KEY
```

当前 deterministic workflow 和测试不会真实调用 OpenAI。

后续接入真实 AI 生成时，可用：

```bash
export OPENAI_API_KEY="你的 key"
```

不要提交、打印或记录密钥。特别注意不要提交 `ref/ai.txt` 中的任何内容。

## 11. PDF / Playwright 注意事项

PDF renderer 使用可注入 engine：

- 测试使用 fake engine，不需要浏览器。
- 真实导出默认使用 Playwright / Chromium。

如果真实 PDF 导出失败，可能原因包括：

1. Playwright 浏览器未安装。
2. 本机 Chrome / Chromium 不可用。
3. 系统权限限制浏览器启动。

可尝试：

```bash
cd backend
uv run playwright install chromium
```

如果只是运行测试，不需要安装 Chromium。

## 12. 常见问题排查

### 12.1 `pytest: command not found`

使用 uv 时请运行：

```bash
cd backend
uv run --extra dev pytest -v
```

不要只运行 `uv run pytest -v`，因为新环境可能还没有安装 dev extras。

### 12.2 前端 `vitest: command not found`

说明前端依赖还未安装：

```bash
cd frontend
npm install
npm test
```

### 12.3 前端页面打不开

检查前端 dev server 是否启动：

```bash
cd frontend
npm run dev
```

然后访问：

```text
http://127.0.0.1:5173
```

### 12.4 前端无法访问 API

确认后端已启动：

```bash
curl http://127.0.0.1:8000/api/health
```

确认返回：

```json
{"status":"ok"}
```

### 12.5 URL ingestion 安全提示

当前 URL ingestion 会访问用户提供的 URL。它只适合可信本地单用户使用。

不要把当前版本暴露到公网或多人环境。未来如需联网部署，需要补充 SSRF 防护。

## 13. 推荐开发顺序

继续开发时建议按以下顺序：

1. 先运行后端和前端测试，确认基线绿色。
2. 新增功能先写测试。
3. 后端改动后运行 `uv run --extra dev pytest -v`。
4. 前端改动后运行 `npm test` 和 `npm run build`。
5. 涉及 UI 的功能需要浏览器手动验证。
