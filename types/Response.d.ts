import { status } from "./status.d.ts";
import { Buffer } from "node";

export = Response;
/*~ Write your module's methods and properties in this class */
declare class Response {
  constructor(
    status?: status | null,
    meta?: string | null,
  );
  _status: status;
  _meta: string | null;
  _body: unknown;
  _setMeta(m: string): void;
  status(s: status): Response;
  getStatus(): status;
  data(d: Uint8Array | string | Buffer, mimeType?: string): Response;
  file(filename: string): Response;
  input(prompt: string, sensitive?: boolean): Response;
  certify(info?: string): Response;
  redirect(url: string): Response;
  format_header(): string;
  format_body(): Uint8Array | string | Buffer;
}
