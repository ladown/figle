import {
  Container,
  render,
  Tabs,
  type TabsOption,
  VerticalSpace,
} from "@create-figma-plugin/ui";
import { h } from "preact";
import { useState } from "preact/hooks";
import { SettingsTab } from "./ui/SettingsTab.js";
import { ExtractTab } from "./ui/ExtractTab.js";

type TabValue = "extract" | "settings";

function Plugin() {
  const [tab, setTab] = useState<TabValue>("extract");

  const options: Array<TabsOption & { value: TabValue }> = [
    { value: "extract", children: <ExtractTab /> },
    { value: "settings", children: <SettingsTab /> },
  ];

  return (
    <Container space="medium">
      <VerticalSpace space="small" />
      <Tabs
        options={options}
        value={tab}
        onValueChange={(value) => setTab(value as TabValue)}
      />
    </Container>
  );
}

export default render(Plugin);
