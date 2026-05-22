import { Muted, Text, VerticalSpace } from "@create-figma-plugin/ui";

export function ExtractTab() {
  return (
    <div>
      <VerticalSpace space="medium" />
      <Text>
        <Muted>
          Select a frame and run extraction. The Spec and warnings will appear
          here.
        </Muted>
      </Text>
      <VerticalSpace space="medium" />
    </div>
  );
}
