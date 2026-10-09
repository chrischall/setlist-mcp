import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

// Claude Code reads a plugin's MCP config from `mcpServers`; an `mcp` key is
// an unknown field it silently ignores (`claude plugin validate` warns). A
// copy of `mcp` with a non-default path breaks the plugin install outright.
describe('.claude-plugin/plugin.json', () => {
  const plugin = JSON.parse(
    readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8'),
  ) as Record<string, unknown>;

  it('declares its MCP config under mcpServers, not mcp', () => {
    expect(plugin).not.toHaveProperty('mcp');
    expect(plugin.mcpServers).toBe('./.mcp.json');
  });

  it('points mcpServers at a file that exists', () => {
    expect(existsSync(new URL(`../${plugin.mcpServers as string}`, import.meta.url))).toBe(true);
  });
});
