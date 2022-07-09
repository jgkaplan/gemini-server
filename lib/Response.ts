import { status } from "./status";
import truncate from "truncate-utf8-bytes";
import mime from "mime";
import fs from "fs";

mime.define({ "text/gemini": ["gemini", "gmi"] });

export default class Response {
  _status: status = 20;
  _meta: string = "";
  _body: Uint8Array | string | Buffer | null = null;

  _setMeta(m: string): void {
    this._meta = truncate(m, 1024);
  }
  constructor(status: status = 20, meta: string = "") {
    this._status = status;
    this._setMeta(meta);
  }

  status(s: status): Response {
    this._status = s;
    return this;
  }

  getStatus(): status {
    return this._status;
  }

  error(s: status = 40, msg: string) : Response {
    this.status(s);
    this._setMeta(msg);
    return this;
  }

  data(d: Uint8Array | string | Buffer, mimeType: string = "text/plain"): Response {
    this.status(20);
    this._body = d;
    this._setMeta(mimeType);
    return this;
  }
  //for success, The <META> line is a MIME media type which applies to the response body.
  //for redirect, <META> is a new URL for the requested resource. The URL may be absolute or relative.
  //for 4* and 5*, The contents of <META> may provide additional information on the failure, and should be displayed to human users.
  file(filename: string): Response { // might throw error if file doesn't exist
    const mimetype = mime.getType(filename);
    if(mimetype == null){
      console.error("mime type of file", filename, "not found");
      return this;
    } else {
      this._body = fs.readFileSync(filename);
      this.status(20);
      this._setMeta(mimetype);
      return this;
    }
  }

  input(prompt: string, sensitive: boolean = false): Response { //client should re-request same url with input as a query param
    this.status(sensitive ? 11 : 10);
    this._setMeta(prompt);
    return this;
  }

  certify(info: string = "Please include a certificate."): Response { //request certificate from client
    this._setMeta(info);
    this.status(60);
    return this;
  }

  redirect(url: string): Response {
    this.status(30);
    this._setMeta(url);
    return this;
  }

  format_header(): string {
    return `${this._status} ${this._meta}\r\n`;
  }
}
