import { Muted, Text, VerticalSpace } from "@create-figma-plugin/ui";

export function SettingsTab() {
  return (
    <div>
      <VerticalSpace space="medium" />
      <Text>
        <Muted>
          Paste the bridge config blob produced by `npx figle sync`.
        </Muted>
      </Text>
      <VerticalSpace space="medium" />
    </div>
  );
}
