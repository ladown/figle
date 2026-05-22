export const PROMPT_PLACEHOLDERS = {
  stack: "{{stack}}",
  specPath: "{{specPath}}",
  warningsCount: "{{warningsCount}}",
} as const;

export const PROMPT_TEMPLATE = `# Generate a Vue 3 SFC from a figle Spec

You are working inside a project that uses **{{stack}}**. A structured Spec describing
a single UI fragment has been written to \`{{specPath}}\`. Your job is to materialize
it into one Vue Single-File Component.

## Inputs

- \`{{specPath}}\` — the validated Spec (see schema in \`@figle/spec-schema\`).
- The project's source tree — read \`CLAUDE.md\`, \`tailwind.config.*\`, and any
  components referenced by \`importPath\` in the Spec before writing code.

## Output rules

- One \`.vue\` file. Use \`<script setup lang="ts">\`.
- Import every project component by the exact \`importPath\` listed on each
  \`ComponentRef\` node, using the \`$component\` value as the local identifier.
- Translate \`TokenRef\` values to Tailwind classes using the project's existing
  token system. Never inline a raw hex when a token is available.
- Respect \`layout.direction\`, \`gap\`, \`padding\`, \`align\`, \`justify\` — emit the
  corresponding Tailwind flex utilities.
- \`semantic\` is a soft hint for HTML element selection (e.g. \`nav\` → \`<nav>\`,
  \`heading-1\` → \`<h1>\`). Use it when it doesn't conflict with the project's
  conventions.

## Warnings

The Spec contains {{warningsCount}} designer-hygiene warnings under
\`spec.warnings\`. For each warning, annotate the generated SFC with an inline
\`<!-- TODO: <code> at <nodePath> — <message> --> \` comment near the affected
markup. Do not silently fix the issue — surface it to the designer.

## Constraints

- Do not invent components or tokens that are not present in the Spec or in the
  project.
- Do not introduce additional state, lifecycle hooks, or props beyond what the
  Spec describes.
- Do not output any prose — only the SFC file content.
`;

export type PromptVars = {
  stack: string;
  specPath: string;
  warningsCount: number;
};

export function renderPrompt(vars: PromptVars): string {
  return PROMPT_TEMPLATE.replace(PROMPT_PLACEHOLDERS.stack, vars.stack)
    .replace(PROMPT_PLACEHOLDERS.specPath, vars.specPath)
    .replace(PROMPT_PLACEHOLDERS.warningsCount, String(vars.warningsCount));
}
