export const __stub = 1;
//       page.on("download", onDownload);
//       this.retainListener(page, () => page.off("download", onDownload));
//     }
//   }
//
//   private safeUrl(value: string) {
//     return this.secrets.sanitizeUrl(value);
//   }
//
//   private console(message: ConsoleMessage): void {
//     const rawText = message.text();
//     const location = message.location();
//     if (!this.admitText("console", rawText, location.url, message.type()))
//       return;
//     this.push({
//       kind: "console",
//       level: this.secrets.redact(message.type()),
//       text: this.secrets.redact(rawText),
//       url: location.url === "" ? null : this.safeUrl(location.url),
//     });
//   }
//
//   private webSocket(socket: WebSocket): void {
//     if (!this.admitOwner("websocket-opened")) return;
//     if (!this.admitText("websocket-opened", socket.url())) return;
//     const url = this.safeUrl(socket.url());
//     this.push({ kind: "websocket-opened", url });
//     const onSent = ({ payload }: { payload: string | Buffer }) =>
//       this.webSocketFrame("websocket-frame-sent", url, payload);
//     const onReceived = ({ payload }: { payload: string | Buffer }) =>
//       this.webSocketFrame("websocket-frame-received", url, payload);
//     const onClose = () => {
//       this.push({ kind: "websocket-closed", url });
//       this.releaseListeners(socket);
//     };
//     socket.on("framesent", onSent);
//     socket.on("framereceived", onReceived);
//     socket.on("close", onClose);
//     this.retainListener(socket, () => socket.off("framesent", onSent));
//     this.retainListener(socket, () => socket.off("framereceived", onReceived));
//     this.retainListener(socket, () => socket.off("close", onClose));
//   }
//
//   private webSocketFrame(
//     kind: "websocket-frame-sent" | "websocket-frame-received",
//     url: SanitizedBrowserUrl,
//     payload: string | Buffer,
//   ): void {
//     const bytes = Buffer.byteLength(payload);
//     const isText = typeof payload === "string";
//     if (!isText) {
//       this.push({
//         kind,
//         url,
//         payload_type: "binary",
//         payload_bytes: bytes,
//         payload_text: null,
//         truncated: false,
//       });
//       return;
//     }
//     if (!this.admitText(kind, payload)) return;
//     const text = this.secrets.redact(payload);
//     this.push({
//       kind,
//       url,
//       payload_type: "text",
//       payload_bytes: bytes,
//       payload_text: text,
//       truncated: false,
//     });
//   }
//
//   private frame(
//     kind: "frame-attached" | "frame-detached" | "frame-navigated",
//     frame: Frame,
//   ): void {
//     if (!this.admitText(kind, frame.url(), frame.name())) return;
//     this.push({
//       kind,
//       url: frame.url() === "" ? null : this.safeUrl(frame.url()),
//       name: frame.name() === "" ? null : this.secrets.redact(frame.name()),
//     });
//   }
//
//   private worker(worker: Worker): void {
//     if (
//       !this.admitOwner("worker-created") ||
//       !this.admitText("worker-created", worker.url())
//     )
//       return;
//     const details = {
//       url: this.safeUrl(worker.url()),
//       name: null,
//     };
//     this.push({ kind: "worker-created", ...details });
//     const onClose = () => {
//       this.push({ kind: "worker-closed", ...details });
//       this.releaseListeners(worker);
//     };
//     worker.on("close", onClose);
//     this.retainListener(worker, () => worker.off("close", onClose));
//   }
//
//   private popup(page: Page): void {
//     if (this.pages.has(page)) return;
//     if (
//       !this.admitOwner("popup-opened") ||
//       !this.admitText("popup-opened", page.url())
//     )
//       return;
//     this.pages.add(page);
//     for (const family of [
//       "frames",
//       "workers",
//       "websockets",
//       "downloads",
//     ] as const)
//       if (this.enabled.has(family)) this.incompleteFamilies.add(family);
//     const opened = {
//       url: page.url() === "" ? null : this.safeUrl(page.url()),
//       name: null,
//     };
//     if (this.enabled.has("popups")) {
//       this.push({ kind: "popup-opened", ...opened });
//       const onClose = () => {
//         if (!this.admitText("popup-closed", page.url())) return;
//         this.push({
//           kind: "popup-closed",
//           url: page.url() === "" ? null : this.safeUrl(page.url()),
//           name: null,
//         });
//       };
//       page.on("close", onClose);
//       this.retainListener(page, () => page.off("close", onClose));
//     }
//     this.observePage(page);
//   }
//
//   private download(download: Download): void {
//     if (
//       this.admitText(
//         "download-cancelled",
//         download.suggestedFilename(),
//         download.url(),
//       )
//     )
//       this.push({
//         kind: "download-cancelled",
//         suggested_filename: this.secrets.redact(download.suggestedFilename()),
//         url: this.safeUrl(download.url()),
//       });
//     void download.cancel().catch((cause: unknown) => {
//       // best-effort cleanup: download cancellation must not reject unhandled.
//       void cause;
//     });
//   }
// }
export const _l = 158;
