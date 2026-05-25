import { z } from "zod";

export const StackSchema = z.enum(["vue3-ts-tailwind"]);

export type Stack = z.infer<typeof StackSchema>;

const NamedSlotStrategySchema = z.enum([
  "first-icon",
  "last-icon",
  "first-text",
]);

export const SlotModeSchema = z.union([
  z.literal("auto-text"),
  z.literal("auto-children"),
  z.object({
    named: z.record(z.string(), NamedSlotStrategySchema),
  }),
]);

export type SlotMode = z.infer<typeof SlotModeSchema>;

export const ComponentDescriptorSchema = z.object({
  import: z.string().min(1),
  as: z.string().min(1),
  propMap: z.record(z.string(), z.string()).optional(),
  slots: z.record(z.string(), SlotModeSchema).optional(),
});

export type ComponentDescriptor = z.infer<typeof ComponentDescriptorSchema>;

export const OutputConfigSchema = z.object({
  dir: z.string().min(1),
});

export type OutputConfig = z.infer<typeof OutputConfigSchema>;

export const BridgeConfigSchema = z.object({
  stack: StackSchema,
  output: OutputConfigSchema.optional(),
  tokens: z.record(z.string(), z.string()),
  components: z.record(z.string(), ComponentDescriptorSchema),
});

export type BridgeConfig = z.infer<typeof BridgeConfigSchema>;

export const BridgeConfigBlobSchema = z.object({
  version: z.literal("0.1"),
  hash: z.string().min(1),
  config: BridgeConfigSchema,
});

export type BridgeConfigBlob = z.infer<typeof BridgeConfigBlobSchema>;

export function defineConfig(config: BridgeConfig): BridgeConfig {
  return config;
}
