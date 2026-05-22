import type { BridgeConfig } from "@figle/spec-schema";
import type { RawNode } from "../../src/extract/index.js";

export const DEMO_CARD_META = {
  figmaFileKey: "demo-file-key",
  extractedAt: "2026-05-22T10:00:00.000Z",
};

export const demoCardConfig: BridgeConfig = {
  stack: "vue3-ts-tailwind",
  tokens: {
    "typography/heading/lg": "typography.heading.lg",
  },
  components: {
    Card: {
      import: "@/components/UiCard.vue",
      as: "UiCard",
      propMap: { Variant: "variant" },
      slots: { default: "auto-children" },
    },
    Button: {
      import: "@/components/UiButton.vue",
      as: "UiButton",
      propMap: { Variant: "variant", Size: "size" },
      slots: { default: "auto-text" },
    },
  },
};

export const demoCardRaw: RawNode = {
  id: "i_card",
  name: "Card",
  type: "INSTANCE",
  visible: true,
  instance: {
    mainComponentName: "Card",
    variantProperties: { Variant: "elevated" },
  },
  children: [
    {
      id: "t_welcome",
      name: "Welcome",
      type: "TEXT",
      visible: true,
      text: {
        content: "Welcome",
        typography: {
          fontName: { family: "Inter", style: "Bold" },
          fontSize: 32,
          boundVariable: {
            type: "VARIABLE_ALIAS",
            id: "v_heading_lg",
            name: "heading/lg",
            collection: "typography",
          },
        },
      },
    },
    {
      id: "i_button",
      name: "Button",
      type: "INSTANCE",
      visible: true,
      instance: {
        mainComponentName: "Button",
        variantProperties: { Variant: "primary", Size: "md" },
      },
      children: [
        {
          id: "t_label",
          name: "Get started",
          type: "TEXT",
          visible: true,
          text: {
            content: "Get started",
            typography: {
              fontName: { family: "Inter", style: "Medium" },
              fontSize: 14,
            },
          },
        },
      ],
    },
  ],
};
