import { defineConfig } from "@figle/cli";

export default defineConfig({
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
      slots: { default: "auto-children" },
    },
    Button: {
      import: "@/components/UiButton.vue",
      as: "UiButton",
      propMap: { Variant: "variant", Size: "size" },
      slots: { default: "auto-text" },
    },
  },
});
