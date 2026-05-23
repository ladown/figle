import type { BridgeConfig, Warning, WarningCode } from "@figle/spec-schema";
import type { RawNode } from "../extract/index.js";

export class ResolveContext {
  readonly config: BridgeConfig | null;
  readonly warnings: Warning[] = [];
  private readonly pathStack: string[] = [];
  private readonly seen = new Set<string>();

  constructor(config: BridgeConfig | null) {
    this.config = config;
  }

  enter(name: string): void {
    this.pathStack.push(name);
  }

  exit(): void {
    this.pathStack.pop();
  }

  currentPath(): string {
    return this.pathStack.join(" > ");
  }

  warn(node: RawNode, code: WarningCode, message: string): void {
    if (!this.config) return;
    const key = `${node.id}::${code}::${message}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.warnings.push({
      nodeId: node.id,
      nodePath: this.currentPath() || node.name,
      code,
      message,
    });
  }
}
