import {
  Banner,
  Button,
  IconWarning16,
  Muted,
  Text,
  TextboxMultiline,
  VerticalSpace,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { useEffect, useState } from "preact/hooks";
import { parseConfigBlob } from "../storage.js";
import type {
  ConfigClearHandler,
  ConfigGetHandler,
  ConfigSaveHandler,
  ConfigState,
  ConfigStateHandler,
} from "../events.js";

export function SettingsTab() {
  const [state, setState] = useState<ConfigState>({ configured: false });
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const off = on<ConfigStateHandler>("CONFIG_STATE", setState);
    emit<ConfigGetHandler>("CONFIG_GET");
    return off;
  }, []);

  const onSave = () => {
    const result = parseConfigBlob(input);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setInput("");
    emit<ConfigSaveHandler>("CONFIG_SAVE", result.blob);
  };

  return (
    <div>
      <VerticalSpace space="medium" />
      <Text>
        <Muted>
          Bridge config is <strong>optional</strong>. Without it, the Spec uses
          Figma-side names (variable paths, component names) and the IDE agent
          resolves them against your project. With a config, the plugin
          translates names into project-side aliases. In your project run{" "}
          <code>npx figle sync</code> to copy the blob, then paste it below.
        </Muted>
      </Text>
      <VerticalSpace space="small" />
      <TextboxMultiline
        placeholder="Paste config blob (JSON)…"
        value={input}
        onValueInput={setInput}
        rows={6}
      />
      <VerticalSpace space="small" />
      <Button onClick={onSave} disabled={input.length === 0} fullWidth>
        Save config
      </Button>
      {error && (
        <div>
          <VerticalSpace space="small" />
          <Banner icon={<IconWarning16 />} variant="warning">
            {error}
          </Banner>
        </div>
      )}
      <VerticalSpace space="medium" />
      {state.configured ? (
        <div>
          <Text>
            <Muted>Current config hash: </Muted>
            <code>{state.hash}</code>
          </Text>
          <VerticalSpace space="small" />
          <Button
            onClick={() => emit<ConfigClearHandler>("CONFIG_CLEAR")}
            secondary
          >
            Clear config
          </Button>
        </div>
      ) : (
        <Text>
          <Muted>No config saved. Plugin runs in zero-config mode.</Muted>
        </Text>
      )}
      <VerticalSpace space="medium" />
    </div>
  );
}
