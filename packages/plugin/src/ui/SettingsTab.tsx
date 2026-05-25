import {
  Banner,
  Button,
  IconWarning16,
  Muted,
  Stack,
  Text,
  TextboxMultiline,
  Toggle,
  VerticalSpace,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { useEffect, useMemo, useState } from "preact/hooks";
import { parseConfigBlob } from "../storage.js";
import type {
  ConfigClearHandler,
  ConfigGetHandler,
  ConfigSaveHandler,
  ConfigState,
  ConfigStateHandler,
  ExtractPrefs,
  PrefsGetHandler,
  PrefsSetHandler,
  PrefsStateHandler,
} from "../events.js";

type Comparison =
  | { kind: "empty" }
  | { kind: "invalid"; error: string }
  | { kind: "match"; hash: string }
  | { kind: "differs"; oldHash: string | null; newHash: string };

export function SettingsTab() {
  const [state, setState] = useState<ConfigState>({ configured: false });
  const [prefs, setPrefs] = useState<ExtractPrefs>({ multi: false });
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkInfo, setCheckInfo] = useState<string | null>(null);

  useEffect(() => {
    const offConfig = on<ConfigStateHandler>("CONFIG_STATE", setState);
    const offPrefs = on<PrefsStateHandler>("PREFS_STATE", setPrefs);
    emit<ConfigGetHandler>("CONFIG_GET");
    emit<PrefsGetHandler>("PREFS_GET");
    return () => {
      offConfig();
      offPrefs();
    };
  }, []);

  const comparison = useMemo<Comparison>(
    () => compareInput(input, state),
    [input, state],
  );

  const onSave = () => {
    const result = parseConfigBlob(input);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setInput("");
    setCheckInfo(null);
    emit<ConfigSaveHandler>("CONFIG_SAVE", result.blob);
  };

  const onCheckClipboard = async () => {
    setError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setCheckInfo("Clipboard is empty.");
        setInput("");
        return;
      }
      setInput(text);
      setCheckInfo(null);
    } catch (err) {
      setCheckInfo(
        `Couldn't read clipboard: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const onMultiToggle = (multi: boolean) => {
    setPrefs({ multi });
    emit<PrefsSetHandler>("PREFS_SET", { multi });
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
      <Stack space="small">
        <Button onClick={onSave} disabled={input.length === 0} fullWidth>
          Save config
        </Button>
        <Button onClick={onCheckClipboard} secondary fullWidth>
          Check clipboard
        </Button>
      </Stack>
      <ComparisonHint comparison={comparison} />
      {checkInfo && (
        <div>
          <VerticalSpace space="small" />
          <Text>
            <Muted>{checkInfo}</Muted>
          </Text>
        </div>
      )}
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
      <Toggle value={prefs.multi} onValueChange={onMultiToggle}>
        <Text>Extract multiple at once</Text>
      </Toggle>
      <VerticalSpace space="extraSmall" />
      <Text>
        <Muted>
          When enabled, selecting several frames runs Extract on all of them and
          bundles the results into one paste.
        </Muted>
      </Text>
      <VerticalSpace space="medium" />
    </div>
  );
}

function compareInput(input: string, state: ConfigState): Comparison {
  if (input.trim().length === 0) return { kind: "empty" };
  const parsed = parseConfigBlob(input);
  if (!parsed.ok) return { kind: "invalid", error: parsed.error };
  const newHash = parsed.blob.hash;
  const oldHash = state.configured ? state.hash : null;
  if (oldHash === newHash) return { kind: "match", hash: newHash };
  return { kind: "differs", oldHash, newHash };
}

function ComparisonHint({ comparison }: { comparison: Comparison }) {
  if (comparison.kind === "empty") return null;
  if (comparison.kind === "invalid") return null;

  if (comparison.kind === "match") {
    return (
      <div>
        <VerticalSpace space="small" />
        <Text>
          <Muted>
            This blob matches the saved config (<code>{comparison.hash}</code>).
            Nothing to update.
          </Muted>
        </Text>
      </div>
    );
  }

  if (comparison.oldHash === null) {
    return (
      <div>
        <VerticalSpace space="small" />
        <Text>
          <Muted>
            Will save config <code>{comparison.newHash}</code>.
          </Muted>
        </Text>
      </div>
    );
  }
  return (
    <div>
      <VerticalSpace space="small" />
      <Text>
        <Muted>
          Will replace <code>{comparison.oldHash}</code> with{" "}
          <code>{comparison.newHash}</code>.
        </Muted>
      </Text>
    </div>
  );
}
