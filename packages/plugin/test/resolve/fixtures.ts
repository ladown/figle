import type { BridgeConfig } from "@figle/spec-schema";
import type { RawNode } from "../../src/extract/index.js";

export const demoConfig: BridgeConfig = {
  stack: "vue3-ts-tailwind",
  tokens: {
    "typography/heading/lg": "typography.heading.lg",
    "color/surface/elevated": "colors.surface.elevated",
  },
  components: {
    Card: {
      import: "@/components/UiCard.vue",
      as: "UiCard",
      propMap: { Variant: "variant" },
    },
    Button: {
      import: "@/components/UiButton.vue",
      as: "UiButton",
      propMap: { Variant: "variant", Size: "size" },
      slots: { default: "auto-text" },
    },
  },
};

export function textNode(
  content: string,
  opts: Partial<RawNode> = {},
): RawNode {
  return {
    id: opts.id ?? "t1",
    name: opts.name ?? content,
    type: "TEXT",
    visible: true,
    text: {
      content,
      typography: {
        fontName: { family: "Inter", style: "Regular" },
        fontSize: 16,
        ...opts.text?.typography,
      },
    },
    ...opts,
  };
}

export function instanceNode(
  componentName: string,
  variants: Record<string, string>,
  children: RawNode[] = [],
  opts: Partial<RawNode> = {},
): RawNode {
  return {
    id: opts.id ?? `i_${componentName}`,
    name: opts.name ?? componentName,
    type: "INSTANCE",
    visible: true,
    instance: {
      mainComponentName: componentName,
      variantProperties: variants,
    },
    children,
    ...opts,
  };
}
