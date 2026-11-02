# Bops en Windows (fork)

Este fork corre Bops en Windows 10/11 (x64). Los bots trabajan igual que en Mac: en las computadoras en
la nube de Orgo, con Slack, Telegram, correo, teléfono y rutinas. Lo que en Mac usa funciones del
sistema está adaptado así:

| En Mac | En Windows |
|---|---|
| Bóveda en el Keychain | Cifrada con DPAPI para tu usuario de Windows, en `%APPDATA%\Bops\vault.json` (`lib/server/keychain-win.ts`) |
| `caffeinate` mantiene la Mac despierta | `SetThreadExecutionState` mantiene la PC despierta mientras corre una tarea (`lib/server/awake.ts`) |
| Socket Unix para el render | Named pipe `\\.\pipe\bops-render-<usuario>` |
| Enlaces simbólicos del servidor empacado | Junctions para carpetas y copia para archivos (no pide administrador) |

**No disponible en Windows** (ya lo apaga `lib/server/mac.ts` fuera de macOS): tareas en tu propia
computadora, Acceso completo y control de tus apps. Esas funciones dependen de `sandbox-exec` y de
la automatización de macOS. Tampoco viene `orgo-relay` (binario privado de Orgo, solo Mac), así que no
hay "Route through this Mac".

## Correrlo

Requisitos: Node 22+, Git for Windows y una cuenta de Orgo y llaves de OpenAI (ver README, "Run it yourself").

```powershell
npm install
copy .env.example .env.local   # llena OPENAI_API_KEY, OPENAI_EXECUTOR_API_KEY y ORGO_API_KEY
npm run app                    # abre la app y arranca el servidor en el puerto 3210
```

Solo el servidor, en el navegador: `npx next dev --port 3210 -H 127.0.0.1` y abre http://127.0.0.1:3210.

## Instalador

```powershell
npm run app:dist:win           # next build + instalador NSIS en dist-desktop\
```

El instalador sale sin firmar: Windows SmartScreen avisará la primera vez. Para repartirlo a clientes,
firmarlo con un certificado de firma de código (`CSC_LINK`, `CSC_KEY_PASSWORD`).

## Licencia y nombre

FSL-1.1: se vale para uso interno y para servicios profesionales a un cliente que lo usa internamente.
No se vale venderlo como producto que compita con Bops. Para entregarlo a clientes, cámbiale el nombre
y el logo (`TRADEMARK.md`).

## Sin probar todavía en Windows real

Estos cambios se escribieron y se revisaron en Linux (tipos, sintaxis y una prueba de la bóveda con un
PowerShell simulado). Falta la primera corrida en una PC con Windows.
