import "server-only";
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * The Vault on Windows. There's no Keychain: each secret is encrypted with DPAPI for the signed-in
 * Windows user (ProtectedData, CurrentUser), so only that user on that PC can read it back, and kept
 * as base64 in %APPDATA%\Bops\vault.json. The value goes to PowerShell on stdin, never in its
 * arguments, so it doesn't show up in the process list. BOPS_VAULT_FILE moves the file.
 */
const FILE = process.env.BOPS_VAULT_FILE || join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "Bops", "vault.json");

const PROTECT = `Add-Type -AssemblyName System.Security; $t=[Console]::In.ReadToEnd(); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($t),$null,'CurrentUser'))`;
const UNPROTECT = `Add-Type -AssemblyName System.Security; $t=[Console]::In.ReadToEnd().Trim(); [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($t),$null,'CurrentUser'))`;

function powershell(script: string, input: string) {
  return new Promise<string>((resolve, reject) => {
    const p = execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], { windowsHide: true, timeout: 15_000, maxBuffer: 4 * 1024 * 1024 }, (e, out, err) =>
      e ? reject(new Error(`Windows refused it: ${String(err).trim() || e.message}`)) : resolve(String(out).replace(/\r?\n$/, "")),
    );
    p.stdin?.end(input);
  });
}

type Vault = Record<string, string>;

async function load(): Promise<Vault> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Vault;
  } catch {
    return {};
  }
}

// One write at a time, so two saves at once don't drop each other's secret.
let chain: Promise<unknown> = Promise.resolve();
function change(edit: (v: Vault) => void) {
  const next = chain.then(async () => {
    const vault = await load();
    edit(vault);
    await mkdir(dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(vault, null, 2), "utf8");
    await rename(tmp, FILE);
  });
  chain = next.catch(() => {});
  return next;
}

export async function setSecretWin(account: string, value: string) {
  const sealed = await powershell(PROTECT, value);
  await change((v) => {
    v[account] = sealed;
  });
}

export async function getSecretWin(account: string) {
  const sealed = (await load())[account];
  if (!sealed) return null;
  return powershell(UNPROTECT, sealed).catch(() => null);
}

export async function deleteSecretWin(account: string) {
  await change((v) => {
    delete v[account];
  }).catch(() => {});
}
