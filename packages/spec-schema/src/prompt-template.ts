export const PROMPT_PLACEHOLDERS = {
  stack: "{{stack}}",
  specPath: "{{specPath}}",
  warningsSummary: "{{warningsSummary}}",
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
- For every \`TokenRef\` (\`{ "$token": "..." }\`), read the project's token
  system (Tailwind config, CSS variables, etc.) and emit the matching utility
  class — e.g. \`{ "$token": "colors.primary.500" }\` becomes \`bg-primary-500\`
  or \`text-primary-500\` based on context. Never inline a raw hex when a token
  reference is available.
- A \`LayoutNode\` is a flex container. \`layout.direction\` \`"col"\` → \`flex-col\`,
  \`"row"\` → \`flex-row\`. Use the project's spacing scale for \`gap\` and
  \`padding\` token refs; for numeric values, use the nearest scale step.
- \`semantic\` is a soft hint for HTML element selection (e.g. \`nav\` → \`<nav>\`,
  \`heading-1\` → \`<h1>\`). Use it when it doesn't conflict with the project's
  conventions.
- Pass a \`ComponentRef\`'s \`props\` through directly to the project component.
  Pass \`children\` and \`slots\` to their respective Vue slots.

## Warnings

The Spec contains {{warningsSummary}} under \`spec.warnings\`. For each warning,
annotate the generated SFC with an inline
\`<!-- TODO: <code> at <nodePath> — <message> -->\` comment near the affected
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
  const summary =
    vars.warningsCount === 0
      ? "no designer-hygiene warnings"
      : `${vars.warningsCount} designer-hygiene warning${
          vars.warningsCount === 1 ? "" : "s"
        }`;
  return PROMPT_TEMPLATE.replaceAll(PROMPT_PLACEHOLDERS.stack, vars.stack)
    .replaceAll(PROMPT_PLACEHOLDERS.specPath, vars.specPath)
    .replaceAll(PROMPT_PLACEHOLDERS.warningsSummary, summary);
}
