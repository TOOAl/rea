/**
 * Atlassian — Jira/Confluence MCP (Gap #8 협업)
 * GitHub MCP는 Fleet gh/diffs로 부분 흡수, Atlassian은 PR↔이슈 동기화에 필요.
 * ATLASSIAN_SITE + ATLASSIAN_EMAIL + ATLASSIAN_API_TOKEN이 있으면 실제 API 호출,
 * 없으면 fallback mock으로 ToolRegistry에 등록만 (토큰 절감, graceful degrade).
 *
 * 참고: Atlassian MCP는 Jira/Confluence REST API를 MCP 툴로 노출.
 */
import type { Tool, _ToolContext } from "./types.js";

async function atlassianFetch(path: string, opts: { method?: string; body?: unknown } = {}): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const site = process.env.ATLASSIAN_SITE;
  const email = process.env.ATLASSIAN_EMAIL;
  const token = process.env.ATLASSIAN_API_TOKEN;
  if (!site || !email || !token) return { ok: false, error: "Atlassian env not set (ATLASSIAN_SITE/EMAIL/API_TOKEN)" };
  try {
    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    const url = `https://${site}${path}`;
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", Accept: "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `${res.status} ${res.statusText} — ${JSON.stringify(data).slice(0,500)}` };
    return { ok: true, data };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const JiraSearchTool: Tool = {
  name: "JiraSearch",
  description: "Atlassian Jira 이슈 검색 (JQL). GitHub MCP가 커밋/PR을 다룬다면, Atlassian은 이슈/스프린트를 다룬다. env ATLASSIAN_SITE/EMAIL/API_TOKEN 필요, 없으면 fallback.",
  inputSchema: {
    type: "object",
    properties: {
      jql: { type: "string", description: "JQL 쿼리, 예: project=PROJ AND status='In Progress'" },
      maxResults: { type: "string", description: "최대 결과 수 (기본 10)" },
    },
    required: ["jql"],
  },
  isConcurrencySafe: true,
  async execute(input): Promise<string> {
    const jql = String(input.jql);
    const maxResults = input.maxResults ? parseInt(String(input.maxResults), 10) : 10;
    const res = await atlassianFetch(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`);
    if (!res.ok) return `JiraSearch fallback (no env or API fail): JQL="${jql}" — ${res.error} — In production would query https://${process.env.ATLASSIAN_SITE ?? "your-site.atlassian.net"}/rest/api/3/search`;
    const issues = (res.data as { issues?: Array<{ key: string; fields: { summary: string } }> })?.issues ?? [];
    if (issues.length === 0) return `JiraSearch: no issues for JQL "${jql}"`;
    return `JiraSearch: ${issues.length} issues for "${jql}"\n` + issues.map(i => `- ${i.key}: ${i.fields.summary}`).join("\n");
  },
};

export const JiraCreateIssueTool: Tool = {
  name: "JiraCreateIssue",
  description: "Atlassian Jira 이슈 생성. Fleet task와 Jira 티켓을 동기화할 때 사용.",
  inputSchema: {
    type: "object",
    properties: {
      project: { type: "string", description: "Jira project key, 예: PROJ" },
      summary: { type: "string", description: "이슈 제목" },
      description: { type: "string", description: "이슈 본문 (선택)" },
      issueType: { type: "string", description: "이슈 타입, 기본 Task" },
    },
    required: ["project", "summary"],
  },
  isConcurrencySafe: false,
  async execute(input): Promise<string> {
    const project = String(input.project);
    const summary = String(input.summary);
    const description = input.description ? String(input.description) : "";
    const issueType = input.issueType ? String(input.issueType) : "Task";
    const res = await atlassianFetch("/rest/api/3/issue", {
      method: "POST",
      body: { fields: { project: { key: project }, summary, description: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: description }] }] }, issuetype: { name: issueType } } },
    });
    if (!res.ok) return `JiraCreateIssue fallback: project=${project} summary="${summary}" — ${res.error} — In production would POST to Jira`;
    const key = (res.data as { key?: string })?.key ?? "UNKNOWN";
    return `JiraCreateIssue: created ${key} — "${summary}"`;
  },
};

export const ConfluenceSearchTool: Tool = {
  name: "ConfluenceSearch",
  description: "Atlassian Confluence 페이지 검색 (CQL). RAG 외부 소스로 Confluence 문서를 주입할 때 사용.",
  inputSchema: {
    type: "object",
    properties: {
      cql: { type: "string", description: "CQL 쿼리, 예: space=DEV AND title~\"API\"" },
      limit: { type: "string", description: "최대 결과 수 (기본 10)" },
    },
    required: ["cql"],
  },
  isConcurrencySafe: true,
  async execute(input): Promise<string> {
    const cql = String(input.cql);
    const limit = input.limit ? parseInt(String(input.limit), 10) : 10;
    const res = await atlassianFetch(`/wiki/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}`);
    if (!res.ok) return `ConfluenceSearch fallback: CQL="${cql}" — ${res.error} — In production would query Confluence CQL`;
    const results = (res.data as { results?: Array<{ id: string; title: string; _links: { webui: string } }> })?.results ?? [];
    if (results.length === 0) return `ConfluenceSearch: no pages for CQL "${cql}"`;
    return `ConfluenceSearch: ${results.length} pages for "${cql}"\n` + results.map(r => `- ${r.title} (${r.id}) ${r._links.webui}`).join("\n");
  },
};

export const ATLASSIAN_TOOLS = [JiraSearchTool, JiraCreateIssueTool, ConfluenceSearchTool];
