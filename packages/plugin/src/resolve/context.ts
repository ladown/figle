import type { BridgeConfig, Warning, WarningCode } from "@figle/spec-schema";
import type { RawNode } from "../extract/index.js";

export class ResolveContext {
  readonly config: BridgeConfig;
  readonly warnings: Warning[] = [];
  private readonly pathStack: string[] = [];

  constructor(config: BridgeConfig) {
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
    this.warnings.push({
      nodeId: node.id,
      nodePath: this.currentPath() || node.name,
      code,
      message,
    });
  }
}
