import {
  Container,
  render,
  Tabs,
  type TabsOption,
  VerticalSpace,
} from "@create-figma-plugin/ui";
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
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Container space="medium">
        <VerticalSpace space="small" />
      </Container>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        <Container space="medium">
          <Tabs
            options={options}
            value={tab}
            onValueChange={(value) => setTab(value as TabValue)}
          />
        </Container>
      </div>
    </div>
  );
}

export default render(Plugin);
