# CV Builder 项目中文说明

## 1. 项目定位

CV Builder 是一个本地单用户简历生成工具，用于根据职位描述（JD）生成面向新西兰 / 澳大利亚 IT 求职场景的申请材料。

当前 MVP 目标是提供一条本地可运行、可测试的完整骨架流程：

1. 维护一份结构化 Master CV。
2. 从文本、文件、URL 或 fixture JSON 创建 application run。
3. 运行本地确定性生成流程。
4. 生成 ATS CV、Portfolio CV、Cover Letter 和 Review Result。
5. 将生成结果导出为本地 PDF。

项目当前是本地优先、单用户、无认证、无 SaaS 的工具。请不要将当前版本直接暴露到公网或多人环境。

## 2. 技术栈

### 后端

- Python
- FastAPI
- Pydantic v2
- 本地 JSON 文件存储
- LangChain / LangGraph 风格工作流边界
- OpenAI `gpt-5.4` AI 客户端边界
- Jinja2 HTML 模板
- Playwright PDF 渲染引擎
- pytest 测试

### 前端

- React
- TypeScript
- Vite
- Ant Design
- Vitest
- Testing Library

## 3. 当前目录结构

```text
backend/
  app/
    ai/                 # AI 客户端边界、工作流状态和确定性节点
    api/                # FastAPI 路由
    models/             # Pydantic 数据模型
    services/           # JSON 存储、JD 解析、PDF 渲染
    static/             # PDF 打印 CSS
    templates/          # PDF HTML 模板
  tests/                # 后端测试
  pyproject.toml
  uv.lock

frontend/
  src/
    api/                # 前端 API helper
    pages/              # 页面组件
    types/              # TypeScript 类型
    App.tsx             # Ant Design 导航布局
  package.json
  vite.config.ts

docs/
  project-zh.md         # 本文档
  superpowers/plans/    # 实施计划文档
```

## 4. 后端架构

### 4.1 FastAPI 应用入口

后端应用通过 `backend/app/main.py` 中的 `create_app()` 创建。

启动时会：

- 加载 `Settings`
- 初始化 `JsonStorage`
- 注册 Master CV API
- 注册 Applications API
- 提供 `/api/health` 健康检查

### 4.2 配置

配置位于 `backend/app/config.py`。

关键字段包括：

- `data_dir`：本地 JSON 数据目录，默认用于保存 Master CV 和 application run。
- `ai_provider`：默认 `openai`。
- `ai_model`：默认 `gpt-5.4`。
- `openai_api_key_env`：默认读取 `OPENAI_API_KEY`。
- `default_mode`：默认 `assisted`。
- `gap_questions_enabled`：默认开启。

### 4.3 数据模型

模型位于 `backend/app/models/`。

主要模型：

- `MasterCv`：主简历，包括 profile、skills、work experience、projects 等。
- `ApplicationRun`：一次职位申请生成流程的状态。
- `ApplicationDocuments`：生成文档，包含 ATS CV、Portfolio CV、Cover Letter。
- `ReviewResult`：生成结果的审查评分和问题列表。

Master CV 同时保留结构化字段和较长的 narrative 字段，便于后续 AI 生成时使用真实经历而不是编造内容。

### 4.4 本地 JSON 存储

存储服务位于 `backend/app/services/storage.py`。

特点：

- 使用本地 JSON 文件保存数据。
- 使用临时文件 + `os.replace()` 做原子写入。
- 读取时通过 Pydantic 模型校验。
- application ID 做了路径安全校验，避免路径穿越。

典型数据包括：

```text
backend/data/master_cv.json
backend/data/applications/<application_id>/run.json
backend/data/applications/<application_id>/exports/*.pdf
```

`backend/data/` 是本地运行数据目录，不应提交到 Git。

## 5. 后端 API

### 5.1 Health

```http
GET /api/health
```

返回：

```json
{"status": "ok"}
```

### 5.2 Master CV

```http
GET /api/master-cv
PUT /api/master-cv
POST /api/master-cv/validate
```

用途：

- 读取默认或已保存的 Master CV。
- 更新 Master CV。
- 校验 Master CV payload。

### 5.3 Applications

```http
POST /api/applications
POST /api/applications/from-file
POST /api/applications/from-fixture
POST /api/applications/from-url
GET /api/applications
GET /api/applications/{application_id}
POST /api/applications/{application_id}/generate
POST /api/applications/{application_id}/export
GET /api/applications/{application_id}/exports/{filename}
```

用途：

- 从 JD 文本、上传文件、fixture JSON 或 URL 创建 application run。
- 查询 application run。
- 运行本地生成工作流。
- 导出 PDF。
- 下载导出的 PDF。

## 6. JD 输入方式

当前支持四种 JD 输入：

1. `text`：直接粘贴职位描述文本。
2. `file`：上传文本文件。
3. `url`：抓取职位页面并提取文本。
4. `fixture_json`：读取结构化 fixture JSON。

安全说明：URL ingestion 会访问用户提供的 URL。当前 MVP 只适合可信本地单用户使用；如果未来部署到网络环境，需要添加 SSRF 防护，例如：

- 限制 scheme。
- 拦截 localhost / private IP。
- 检查 redirect 目标。
- 限制响应大小。
- 设置更严格的超时和内容类型校验。

## 7. AI 与工作流

### 7.1 AI 客户端边界

`backend/app/ai/client.py` 定义了 OpenAI 结构化输出客户端边界。

当前默认模型是：

```text
gpt-5.4
```

客户端通过 LangChain `ChatOpenAI` 使用结构化输出。当前测试通过 fake model 验证边界，不会真实调用 OpenAI。

### 7.2 当前生成流程

当前 MVP 的工作流是确定性的本地 skeleton，不会真实调用 OpenAI。

入口：

```python
run_workflow(master_cv, application)
```

节点顺序：

1. `jd_extract_node`
2. `company_research_node`
3. `jd_analysis_node`
4. `positioning_node`
5. `gap_questions_node`
6. `writer_node`
7. `reviewer_node`

这些节点会根据 Master CV 和 JD 文本生成：

- `generated_documents`
- `review_result`
- 初步 evidence map
- gap questions

后续可以把这些确定性节点替换为真实 OpenAI `gpt-5.4` 结构化生成调用。

## 8. PDF 导出

PDF 渲染位于：

```text
backend/app/services/pdf_renderer.py
```

设计特点：

- `PdfEngine` 是可注入协议。
- 测试使用 fake PDF engine，不依赖真实浏览器。
- 默认实现 `PlaywrightPdfEngine` 使用 Chromium 生成 PDF。
- HTML 模板位于 `backend/app/templates/`。
- CSS 位于 `backend/app/static/`。

生成的 PDF 包括：

- `ats_cv.pdf`
- `portfolio_cv.pdf`
- `cover_letter.pdf`

下载接口做了路径约束和 allowlist，避免路径穿越。

## 9. 前端架构

前端位于 `frontend/`。

### 9.1 应用框架

`frontend/src/App.tsx` 使用 Ant Design `Layout` 和 `Menu` 提供侧边导航。

当前页面：

- Dashboard
- Master CV
- Application Workspace
- Generated Documents
- Settings

### 9.2 Master CV 编辑器

`frontend/src/pages/MasterCvEditor.tsx` 已连接后端 API。

功能：

- 页面加载时调用 `GET /api/master-cv`。
- 将 profile 字段填充到 Ant Design Form。
- 保存时调用 `PUT /api/master-cv`。
- 保存按钮在初始数据未加载或保存中时禁用。
- 加载和保存失败会显示错误提示。

当前编辑字段：

- Full name
- Email
- GitHub
- LinkedIn
- Portfolio

### 9.3 前端 API 封装

```text
frontend/src/api/client.ts
frontend/src/api/masterCv.ts
frontend/src/types/masterCv.ts
```

`client.ts` 提供通用 `apiGet` 和 `apiPut`。

`masterCv.ts` 提供：

```ts
getMasterCv()
saveMasterCv(masterCv)
```

## 10. 本地运行方式

### 10.1 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
pytest -v
uvicorn app.main:app --reload
```

如果使用 `uv`：

```bash
cd backend
uv run --extra dev pytest -v
uv run uvicorn app.main:app --reload
```

### 10.2 前端

```bash
cd frontend
npm install
npm test
npm run dev
```

默认前端开发服务器会代理 `/api` 到：

```text
http://127.0.0.1:8000
```

## 11. 测试

### 11.1 后端测试

运行：

```bash
cd backend
uv run --extra dev pytest -v
```

当前覆盖：

- health endpoint
- Master CV API
- JSON storage
- application storage
- application API
- JD ingestion
- AI client boundary
- workflow skeleton
- workflow API
- document/review models
- PDF renderer
- export endpoint安全边界
- 本地 MVP smoke path

### 11.2 前端测试

运行：

```bash
cd frontend
npm test
```

当前覆盖：

- App 导航渲染
- Master CV editor 加载、保存、错误处理和按钮状态

### 11.3 前端构建

```bash
cd frontend
npm run build
```

当前构建会通过，但 Ant Design bundle 会触发 Vite chunk size warning。这是已知非阻塞提示。

## 12. 安全边界

当前项目是本地单用户 MVP。

已经具备的基础保护：

- `.env`、`ref/`、本地数据目录被 `.gitignore` 忽略。
- application ID 做路径安全校验。
- PDF 下载路径做目录约束和文件名 allowlist。
- export 前检查 generated documents 是否存在。
- 测试不真实调用 OpenAI。
- 测试不需要真实 Playwright 浏览器渲染 PDF。

仍需注意：

- 不要提交或打印 `ref/ai.txt` 中的密钥。
- 不要把当前 URL ingestion 暴露给不可信用户。
- 当前没有认证和权限系统。
- 当前 workflow 是确定性 skeleton，不是真实 AI 生成。

## 13. 当前 MVP 限制

当前已完成后端闭环和 Master CV 前端编辑，但还有一些后续工作：

1. 将确定性 workflow 节点替换为真实 OpenAI `gpt-5.4` structured generation。
2. 在前端补充 JD 文本 / 文件 / URL / fixture JSON 创建 application run 的 UI。
3. 在前端补充生成文档预览、编辑和导出 UI。
4. 加入真实 web search / company research provider。
5. 加入 source trace 展示与人工确认流程。
6. 增加 PDF 页数、文本抽取和 ATS 安全检查。
7. 如果未来需要多人或联网部署，需要补认证、权限、SSRF 防护、数据隔离和审计。

## 14. 开发原则

本项目当前实现遵循：

- 本地优先。
- 单用户私有数据。
- 不在 AI 中编造经历。
- AI 只参与 JD 匹配、生成和审查，不参与 profile 原始信息录入。
- 后端和前端都优先保持小而清晰的文件职责。
- 自动化测试覆盖关键数据流和安全边界。

## 15. 快速验收清单

在交付或继续开发前，可以运行：

```bash
cd backend
uv run --extra dev pytest -v

cd ../frontend
npm install
npm test
npm run build
```

期望结果：

- 后端测试全部通过。
- 前端测试全部通过。
- 前端构建通过。
- 可能出现 Ant Design chunk-size warning，但不影响构建成功。
