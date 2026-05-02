# CV Builder 使用文档

## 1. 适用对象

本文档面向本地使用 CV Builder 的用户，说明如何使用当前 MVP 完成一条简历生成流程。

当前版本是本地单用户 MVP，功能还不是完整产品。它适合用于：

- 维护结构化 Master CV。
- 根据职位描述创建 application run。
- 运行本地确定性生成流程。
- 生成 ATS CV、Portfolio CV、Cover Letter 和 Review Result。
- 本地导出 PDF。

## 2. 当前 MVP 能做什么

当前已完成：

- 后端 Master CV 读写。
- 后端 application run 创建。
- JD 文本、文件、URL、fixture JSON ingestion。
- 本地 deterministic workflow。
- ATS CV / Portfolio CV / Cover Letter 数据生成。
- Review Result 生成。
- PDF 导出接口。
- 前端基础导航。
- 前端 Master CV profile 字段读取和保存。

当前前端尚未完成：

- 创建 application run 的 UI。
- 查看生成文档的 UI。
- 点击导出 PDF 的 UI。

这些能力后端已经有接口，前端页面目前仍是占位页。

## 3. 启动系统

需要同时启动后端和前端。

### 3.1 启动后端

```bash
cd backend
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

后端地址：

```text
http://127.0.0.1:8000
```

### 3.2 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端地址：

```text
http://127.0.0.1:5173
```

浏览器打开该地址即可使用前端。

## 4. 前端页面说明

左侧导航包含：

- Dashboard
- Master CV
- Application Workspace
- Generated Documents
- Settings

### 4.1 Dashboard

当前是概览占位页，用于后续展示 Master CV 完整度和最近 application runs。

### 4.2 Master CV

当前可用页面。

功能：

- 自动从后端加载 Master CV。
- 显示并编辑 profile 字段。
- 保存 Master CV。

当前可编辑字段：

- Full name
- Email
- GitHub
- LinkedIn
- Portfolio

使用步骤：

1. 打开前端。
2. 点击左侧 `Master CV`。
3. 等待表单加载。
4. 填写或修改字段。
5. 点击 `Save Master CV`。
6. 看到 `Master CV saved` 提示即表示保存成功。

### 4.3 Application Workspace

当前是占位页。

后续会用于：

- 粘贴 JD 文本。
- 上传 JD 文件。
- 输入职位 URL。
- 使用 fixture JSON。
- 选择 assisted / auto mode。
- 创建 application run。

### 4.4 Generated Documents

当前是占位页。

后续会用于：

- 查看 ATS CV。
- 查看 Portfolio CV。
- 查看 Cover Letter。
- 查看 Review Result。
- 导出 PDF。

### 4.5 Settings

当前是占位页。

后续会用于配置：

- OpenAI `gpt-5.4`
- search provider
- PDF export
- workflow defaults

## 5. 后端 API 使用流程

虽然前端还没有完整 UI，但可以通过 API 完成完整 MVP 流程。

以下示例假设后端运行在：

```text
http://127.0.0.1:8000
```

### 5.1 健康检查

```bash
curl http://127.0.0.1:8000/api/health
```

期望：

```json
{"status":"ok"}
```

### 5.2 读取 Master CV

```bash
curl http://127.0.0.1:8000/api/master-cv
```

如果本地还没有 `master_cv.json`，后端会返回默认空 Master CV。

### 5.3 更新 Master CV

可以通过前端 Master CV 页面保存，也可以通过 API PUT。

示例：

```bash
curl -X PUT http://127.0.0.1:8000/api/master-cv \
  -H 'Content-Type: application/json' \
  -d '{
    "profile": {
      "full_name": "Alex Chen",
      "email": "alex@example.com",
      "github_url": "https://github.com/alexchen",
      "linkedin_url": "https://linkedin.com/in/alexchen",
      "portfolio_url": "https://alexchen.dev"
    },
    "projects": [
      {
        "id": "project_001",
        "name": "StudyMate RAG",
        "type": "academic",
        "technologies": ["Python", "FastAPI", "RAG"],
        "tier": "A",
        "narrative": "Built a retrieval assistant with cited answers."
      }
    ]
  }'
```

实际模型包含更多字段，Pydantic 会用默认值补齐缺失字段。

## 6. 创建 Application Run

### 6.1 从 JD 文本创建

```bash
curl -X POST http://127.0.0.1:8000/api/applications \
  -H 'Content-Type: application/json' \
  -d '{
    "company": "Example Co",
    "role_title": "Junior AI Developer",
    "mode": "assisted",
    "jd_text": "We need Python, FastAPI, and RAG experience."
  }'
```

返回中会包含：

```json
{
  "application_id": "app_..."
}
```

后续命令需要使用这个 `application_id`。

### 6.2 从文件创建

接口：

```http
POST /api/applications/from-file
```

用于上传 JD 文件。

### 6.3 从 fixture JSON 创建

接口：

```http
POST /api/applications/from-fixture
```

用于上传结构化 fixture JSON。

### 6.4 从 URL 创建

接口：

```http
POST /api/applications/from-url
```

安全提醒：当前 URL ingestion 只适合可信本地单用户使用，不要暴露给不可信用户。

## 7. 运行生成流程

创建 application run 后，调用：

```bash
curl -X POST http://127.0.0.1:8000/api/applications/<application_id>/generate
```

示例：

```bash
curl -X POST http://127.0.0.1:8000/api/applications/app_20260502110000000000/generate
```

生成结果会写入 application run：

- `generated_documents.ats_cv`
- `generated_documents.portfolio_cv`
- `generated_documents.cover_letter`
- `review_result`

当前生成流程是本地 deterministic skeleton，不会真实调用 OpenAI。

## 8. 查看 Application Run

```bash
curl http://127.0.0.1:8000/api/applications/<application_id>
```

列出所有 runs：

```bash
curl http://127.0.0.1:8000/api/applications
```

## 9. 导出 PDF

生成完成后调用：

```bash
curl -X POST http://127.0.0.1:8000/api/applications/<application_id>/export
```

成功后，`exports` 字段会包含：

```json
{
  "ats_cv": "ats_cv.pdf",
  "portfolio_cv": "portfolio_cv.pdf",
  "cover_letter": "cover_letter.pdf"
}
```

下载 PDF：

```bash
curl -o ats_cv.pdf \
  http://127.0.0.1:8000/api/applications/<application_id>/exports/ats_cv.pdf
```

其他文件：

```text
portfolio_cv.pdf
cover_letter.pdf
```

注意：真实 PDF 渲染依赖 Playwright / Chromium。如果本机没有安装浏览器，导出可能失败。测试环境使用 fake renderer，不需要浏览器。

## 10. Assisted Mode 与 Auto Mode

当前 `mode` 字段可以是：

- `assisted`
- `auto`

当前 MVP 中 mode 会被保存，但 deterministic workflow 尚未根据 mode 做完整分支。

未来设计：

- `assisted`：在关键信息缺口处向用户提问。
- `auto`：尽量自动生成，但仍不能编造经历。

## 11. Review Result 如何理解

生成后会有 `review_result`。

它包含：

- 是否通过：`passed`
- 总分：`overall_score`
- 多维度评分：truthfulness、JD alignment、ATS safety 等
- blocking issues
- improvement suggestions

当前 reviewer 是 deterministic skeleton，主要用于打通流程。未来会替换为更严格的 AI review agent。

## 12. 数据保存在哪里

本地数据保存在：

```text
backend/data/
```

包括：

- Master CV
- application runs
- 导出的 PDF

这些数据不会自动同步到云端。

如果要重置系统：

```bash
rm -rf backend/data
```

请谨慎操作，这会删除本地数据。

## 13. 当前限制

当前版本限制：

1. 前端只能编辑 Master CV 的 profile 基础字段。
2. 前端还不能创建 application run。
3. 前端还不能查看或导出生成文档。
4. 真实 OpenAI 生成尚未接入 workflow。
5. URL ingestion 未做生产级 SSRF 防护。
6. 没有登录、权限、多用户隔离。
7. PDF 导出依赖本地 Playwright / Chromium。

## 14. 推荐使用方式

当前阶段建议：

1. 用前端维护 Master CV profile。
2. 用 API 创建 application run 和触发 generate。
3. 用 API 导出 PDF。
4. 用测试确认后端流程稳定。
5. 等后续前端补齐 Application Workspace 和 Generated Documents 页面后，再转为完整图形化操作。

## 15. 用户安全提醒

- 不要把 OpenAI API key 写入代码。
- 不要提交 `ref/ai.txt`。
- 不要把本地服务暴露到公网。
- 不要把 URL ingestion 开放给不可信用户。
- AI 生成时必须基于 Master CV 的真实经历，不应编造项目、公司、学历或技能。
