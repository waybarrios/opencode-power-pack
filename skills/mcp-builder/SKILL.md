---
name: mcp-builder
description: Guide the creation of high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when the user wants to build an MCP server to integrate an external API or service, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).
license: MIT (copied from anthropics/skills/skills/mcp-builder)
---

## Overview

Create MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. The quality of an MCP server is measured by how well it enables LLMs to accomplish real-world tasks.

## High-level workflow

Creating a high-quality MCP server involves four main phases.

### Phase 1: Deep research and planning

#### 1.1 Understand modern MCP design

**API coverage vs. workflow tools:** Balance comprehensive API endpoint coverage with specialized workflow tools. Workflow tools can be more convenient for specific tasks, while comprehensive coverage gives agents flexibility to compose operations. Performance varies by client — some clients benefit from code execution that combines basic tools, while others work better with higher-level workflows. When uncertain, prioritize comprehensive API coverage.

**Tool naming and discoverability:** Clear, descriptive tool names help agents find the right tools quickly. Use consistent prefixes (e.g., `github_create_issue`, `github_list_repos`) and action-oriented naming.

**Context management:** Agents benefit from concise tool descriptions and the ability to filter / paginate results. Design tools that return focused, relevant data. Some clients support code execution which can help agents filter and process data efficiently.

**Actionable error messages:** Error messages should guide agents toward solutions with specific suggestions and next steps.

#### 1.2 Study MCP protocol documentation

Start with the sitemap to find relevant pages: `https://modelcontextprotocol.io/sitemap.xml`. Then fetch specific pages with `.md` suffix for markdown format, e.g. `https://modelcontextprotocol.io/specification/draft.md`.

Key pages:

- Specification overview and architecture
- Transport mechanisms (streamable HTTP, stdio)
- Tool, resource, and prompt definitions

#### 1.3 Study framework documentation

**Recommended stack:**

- **Language**: TypeScript (high-quality SDK support, broad compatibility, models generate it well due to static typing and good linting).
- **Transport**: Streamable HTTP for remote servers using stateless JSON; stdio for local servers.

For TypeScript: load `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/main/README.md`.

For Python: load `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`.

#### 1.4 Plan the implementation

- **Understand the API:** review the service's API documentation to identify key endpoints, authentication requirements, and data models.
- **Tool selection:** prioritize comprehensive API coverage. List endpoints to implement, starting with the most common operations.

### Phase 2: Implementation

#### 2.1 Set up project structure

Standard layout for both languages includes a server entry point, a tools module, an API client utility, and a schema definition file.

#### 2.2 Implement core infrastructure

Shared utilities to build first:

- API client with authentication
- Error-handling helpers
- Response formatting (JSON / Markdown)
- Pagination support

#### 2.3 Implement tools

For each tool:

**Input schema:** use Zod (TypeScript) or Pydantic (Python). Include constraints and clear descriptions. Add examples in field descriptions.

**Output schema:** define `outputSchema` where possible for structured data. Use `structuredContent` in tool responses (TypeScript SDK feature). This helps clients understand and process tool outputs.

**Tool description:** concise summary of functionality, parameter descriptions, return-type schema.

**Implementation:** async/await for I/O. Proper error handling with actionable messages. Pagination where applicable. Return both text content and structured data when using modern SDKs.

**Annotations:**

- `readOnlyHint`: true / false
- `destructiveHint`: true / false
- `idempotentHint`: true / false
- `openWorldHint`: true / false

### Phase 3: Review and test

#### 3.1 Code quality

Review for: no duplicated code (DRY), consistent error handling, full type coverage, clear tool descriptions.

#### 3.2 Build and test

**TypeScript:** `npm run build` to verify compilation. Test with the MCP Inspector: `npx @modelcontextprotocol/inspector`.

**Python:** verify syntax with `python -m py_compile your_server.py`. Test with the MCP Inspector.

### Phase 4: Create evaluations

After implementing the server, create evaluations to test its effectiveness with real LLM agents.

#### 4.1 Purpose

Evaluations test whether LLMs can effectively use the MCP server to answer realistic, complex questions.

#### 4.2 Create 10 evaluation questions

1. **Tool inspection** — list available tools and understand their capabilities.
2. **Content exploration** — use READ-ONLY operations to explore available data.
3. **Question generation** — create 10 complex, realistic questions.
4. **Answer verification** — solve each question yourself to verify answers.

#### 4.3 Evaluation requirements

Each question must be:

- **Independent** — not dependent on other questions.
- **Read-only** — only non-destructive operations required.
- **Complex** — requiring multiple tool calls and deep exploration.
- **Realistic** — based on real use cases humans care about.
- **Verifiable** — single, clear answer that can be string-compared.
- **Stable** — the answer will not change over time.

#### 4.4 Output format

Create an XML file with this structure:

```xml
<evaluation>
  <qa_pair>
    <question>Find discussions about AI model launches with animal codenames. One model needed a specific safety designation that uses the format ASL-X. What number X was being determined for the model named after a spotted wild cat?</question>
    <answer>3</answer>
  </qa_pair>
  <!-- More qa_pairs... -->
</evaluation>
```

## Notes

This is a port of the upstream `mcp-builder` skill from `anthropics/skills`. The original ships bundled reference files (`reference/mcp_best_practices.md`, `reference/node_mcp_server.md`, `reference/python_mcp_server.md`, `reference/evaluation.md`) which are not included in this port. When you need deeper detail, fetch them directly from <https://github.com/anthropics/skills/tree/main/skills/mcp-builder/reference>.
