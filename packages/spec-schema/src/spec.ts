import { z } from "zod";

export const SPEC_VERSION = "0.1" as const;

export type TypographyProps = {
  fontFamily: string;
  fontStyle?: string | undefined;
  fontWeight?: number | undefined;
  fontSize: number;
  lineHeight?: number | undefined;
  letterSpacing?: number | undefined;
};

export const TypographyPropsSchema = z.object({
  fontFamily: z.string().min(1),
  fontStyle: z.string().optional(),
  fontWeight: z.number().positive().optional(),
  fontSize: z.number().positive(),
  lineHeight: z.number().nonnegative().optional(),
  letterSpacing: z.number().optional(),
});

export const TokenRefSchema = z.object({
  $token: z.string().min(1),
  fallback: z.union([z.string(), z.number(), TypographyPropsSchema]).optional(),
});

export type TokenRef = z.infer<typeof TokenRefSchema>;

export const PropValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  TokenRefSchema,
]);

export type PropValue = z.infer<typeof PropValueSchema>;

export const WarningCodeSchema = z.enum([
  "UNBOUND_COLOR",
  "UNBOUND_TYPOGRAPHY",
  "UNBOUND_SPACING",
  "UNBOUND_RADIUS",
  "UNKNOWN_COMPONENT",
  "UNMAPPED_TOKEN",
  "AMBIGUOUS_VARIANT",
]);

export type WarningCode = z.infer<typeof WarningCodeSchema>;

export const WarningSchema = z.object({
  nodeId: z.string().min(1),
  nodePath: z.string().min(1),
  code: WarningCodeSchema,
  message: z.string().min(1),
});

export type Warning = z.infer<typeof WarningSchema>;

const LayoutSemanticSchema = z
  .enum(["card", "section", "list", "header", "footer", "nav"])
  .nullable();

const TextSemanticSchema = z
  .enum([
    "heading-1",
    "heading-2",
    "heading-3",
    "heading-4",
    "body",
    "caption",
    "label",
  ])
  .nullable();

const PaddingSchema = z.object({
  top: z.union([TokenRefSchema, z.number()]),
  right: z.union([TokenRefSchema, z.number()]),
  bottom: z.union([TokenRefSchema, z.number()]),
  left: z.union([TokenRefSchema, z.number()]),
});

const LayoutShapeSchema = z.object({
  direction: z.enum(["row", "col"]),
  gap: z.union([TokenRefSchema, z.number()]).optional(),
  padding: PaddingSchema.optional(),
  align: z.enum(["start", "center", "end", "stretch", "baseline"]).optional(),
  justify: z
    .enum(["start", "center", "end", "between", "around", "evenly"])
    .optional(),
  wrap: z.boolean().optional(),
});

const BorderSchema = z.object({
  color: z.union([TokenRefSchema, z.string()]),
  width: z.number().nonnegative(),
  radius: z.union([TokenRefSchema, z.number()]),
});

const SizeSchema = z.object({
  width: z.union([z.number(), z.literal("fill"), z.literal("hug")]).optional(),
  height: z.union([z.number(), z.literal("fill"), z.literal("hug")]).optional(),
});

export type ComponentRef = {
  $component: string;
  importPath?: string | undefined;
  props: Record<string, PropValue>;
  children?: SpecNode[] | undefined;
  slots?: Record<string, SpecNode[]> | undefined;
};

export type LayoutNode = {
  $type: "layout";
  semantic?: z.infer<typeof LayoutSemanticSchema> | undefined;
  layout: z.infer<typeof LayoutShapeSchema>;
  background?: TokenRef | string | undefined;
  border?: z.infer<typeof BorderSchema> | undefined;
  size?: z.infer<typeof SizeSchema> | undefined;
  children: SpecNode[];
};

export type TextNode = {
  $type: "text";
  content: string;
  typography?: TokenRef | TypographyProps | undefined;
  color?: TokenRef | string | undefined;
  semantic?: z.infer<typeof TextSemanticSchema> | undefined;
};

export type SpecNode = ComponentRef | LayoutNode | TextNode;

export const SpecNodeSchema: z.ZodType<SpecNode> = z.lazy(() =>
  z.union([ComponentRefSchema, LayoutNodeSchema, TextNodeSchema]),
);

export const ComponentRefSchema: z.ZodType<ComponentRef> = z.lazy(() =>
  z.object({
    $component: z.string().min(1),
    importPath: z.string().min(1).optional(),
    props: z.record(z.string(), PropValueSchema),
    children: z.array(SpecNodeSchema).optional(),
    slots: z.record(z.string(), z.array(SpecNodeSchema)).optional(),
  }),
);

export const LayoutNodeSchema: z.ZodType<LayoutNode> = z.lazy(() =>
  z.object({
    $type: z.literal("layout"),
    semantic: LayoutSemanticSchema.optional(),
    layout: LayoutShapeSchema,
    background: z.union([TokenRefSchema, z.string()]).optional(),
    border: BorderSchema.optional(),
    size: SizeSchema.optional(),
    children: z.array(SpecNodeSchema),
  }),
);

export const TextNodeSchema: z.ZodType<TextNode> = z.lazy(() =>
  z.object({
    $type: z.literal("text"),
    content: z.string(),
    typography: z.union([TokenRefSchema, TypographyPropsSchema]).optional(),
    color: z.union([TokenRefSchema, z.string()]).optional(),
    semantic: TextSemanticSchema.optional(),
  }),
);

export const SpecMetaSchema = z.object({
  figmaFileKey: z.string().min(1),
  extractedAt: z.iso.datetime(),
});

export type SpecMeta = z.infer<typeof SpecMetaSchema>;

export const SpecSchema = z.object({
  version: z.literal(SPEC_VERSION),
  root: SpecNodeSchema,
  warnings: z.array(WarningSchema),
  meta: SpecMetaSchema,
});

export type Spec = z.infer<typeof SpecSchema>;
