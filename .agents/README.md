# Antigravity MCP

This project includes a local Antigravity MCP configuration for GitHub.

The GitHub token is not stored in the repository. Launch Antigravity through:

```powershell
.\.agents\start-antigravity-with-github-mcp.ps1
```

The launcher reads the active GitHub CLI session at runtime and exposes it only to the Antigravity process.
