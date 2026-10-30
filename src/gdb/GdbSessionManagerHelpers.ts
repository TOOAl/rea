import {
  AnalysisCancelledError,
  AnalysisResourceConstraintError,
} from "../domain/analysisErrorCore.js";

const STARTUP_TIMEOUT_MS = 10_000;

// GdbSessionManagerHelpers.ts 1909-2057
const miQuote = (value: string): string =>
  `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\r", "\\r").replaceAll("\n", "\\n").replaceAll("\t", "\\t")}"`;

/** @internal Decode one unambiguous GDB MI C-string field. */
export const miStringField = (
  record: string,
  field: string,
): string | undefined => {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const valuePattern = `((?:\\\\.|[^"\\\\])*)`;
  const fieldPattern = new RegExp(
    `(?:^|,)${escapedField}="${valuePattern}"`,
    "gu",
  );
  const matches = [...record.matchAll(fieldPattern)];
  if (matches.length !== 1) return undefined;
  const match = new RegExp(
    `^\\d+\\^done,${escapedField}="${valuePattern}"$`,
    "u",
  ).exec(record);
  const raw = match?.[1];
  if (raw === undefined) return undefined;
  const bytes: number[] = [];
  for (let index = 0; index < raw.length;) {
    const character = raw[index]!;
    if (character !== "\\") {
      const codePoint = raw.codePointAt(index);
      if (
        codePoint === undefined ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      )
        return undefined;
      const value = String.fromCodePoint(codePoint);
      bytes.push(...Buffer.from(value, "utf8"));
      index += value.length;
      continue;
    }
    const escaped = raw[++index]!;
    const simple: Readonly<Record<string, number>> = {
      a: 7,
      b: 8,
      f: 12,
      n: 10,
      r: 13,
      t: 9,
      v: 11,
      "\\": 92,
      '"': 34,
      "'": 39,
      "?": 63,
    };
    const simpleByte = simple[escaped];
    if (simpleByte !== undefined) {
      bytes.push(simpleByte);
      index += 1;
      continue;
    }
    if (escaped === "x") {
      const hex = /^[0-9a-f]+/iu.exec(raw.slice(index + 1))?.[0];
      if (hex === undefined) return undefined;
      bytes.push(Number.parseInt(hex, 16) & 0xff);
      index += hex.length;
      index += 1;
      continue;
    }
    if (/[0-7]/u.test(escaped)) {
      const octal = `${escaped}${/^[0-7]{0,2}/u.exec(raw.slice(index + 1))![0]}`;
      bytes.push(Number.parseInt(octal, 8) & 0xff);
      index += octal.length;
      continue;
    }
    return undefined;
  }
  const decoded = Buffer.from(bytes).toString("utf8");
  return Buffer.from(decoded, "utf8").equals(Buffer.from(bytes))
    ? decoded
    : undefined;
};

/** @internal Classify commands that can invalidate the configured output sink. */
export const gdbOneShotCommandMayInvalidateDetachProof = (
  command: string,
): boolean => {
  if (commandMayChangeInferiorOutput(command)) return true;
  const firstToken = /^\s*([^\s;]+)/u.exec(command)?.[1]?.toLowerCase();
  if (
    firstToken !== undefined &&
    (["source", "define", "alias"].some((name) =>
      name.startsWith(firstToken),
    ) ||
      firstToken === "py" ||
      "python".startsWith(firstToken))
  )
    return true;
  // One-shot execution cannot establish which shell/GDB context interprets
  // redirections, nor safely track multiline command definitions.
  return /[<>]{1,2}|&>|[\r\n;]/u.test(command);
};

/** @internal Classify commands that can invalidate the configured output sink. */
export const commandMayChangeInferiorOutput = (command: string): boolean => {
  const setting = /^\s*(?:set|with)\s+(\S+)/iu.exec(command)?.[1];
  const maySetInferiorTty =
    setting !== undefined && "inferior-tty".startsWith(setting.toLowerCase());
  const firstToken = /^\s*([^\s;]+)/u.exec(command)?.[1]?.toLowerCase();
  const mayBeTtyCommand =
    firstToken !== undefined && "tty".startsWith(firstToken);
  const mayDefineAlias =
    firstToken !== undefined && "alias".startsWith(firstToken);
  const mayRunWithOutputRedirection =
    firstToken !== undefined &&
    ["run", "start", "starti"].some((name) => name.startsWith(firstToken)) &&
    /[<>]{1,2}|&>/u.test(command.slice(firstToken.length));
  return (
    maySetInferiorTty ||
    mayBeTtyCommand ||
    mayDefineAlias ||
    /\binferior-tty\b/iu.test(command) ||
    /^\s*(?:wit(?:h)?(?:\s|$)|tty(?:\s|$)|source\b|py\w*|define\b)/iu.test(
      command,
    ) ||
    mayRunWithOutputRedirection
  );
};

/** Terminate only the directly owned debugger process, never its process group or inferiors. */
export const waitForGdbCommandTurn = (
  previous: Promise<void>,
  signal?: AbortSignal,
): Promise<void> => {
  if (signal === undefined) return previous;
  if (signal.aborted)
    return Promise.reject(new AnalysisCancelledError("gdb_console"));
  return new Promise<void>((resolve, reject) => {
    const onAbort = (): void =>
      reject(new AnalysisCancelledError("gdb_console"));
    signal.addEventListener("abort", onAbort, { once: true });
    previous.then(
      () => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      },
      (cause: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(cause);
      },
    );
  });
};
