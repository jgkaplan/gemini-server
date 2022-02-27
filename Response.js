const truncate = require("truncate-utf8-bytes");
const mime = require("mime");
const fs = require("fs");

mime.define({ "text/gemini": ["gemini", "gmi"] });

class Response {
  _status = 20;
  _meta = "";
  _body = null;

  _setMeta(m) {
    this._meta = truncate(m, 1024);
  }
  constructor(status = 20, meta = "") {
    this._status = status;
    this._setMeta(meta);
  }

  status(s) {
    this._status = s;
    return this;
  }

  getStatus() {
    return this._status;
  }

  data(d, mimeType = "text/plain") {
    this.status(20);
    this._body = d;
    this._setMeta(mimeType);
    return this;
  }
  //for success, The <META> line is a MIME media type which applies to the response body.
  //for redirect, <META> is a new URL for the requested resource. The URL may be absolute or relative.
  //for 4* and 5*, The contents of <META> may provide additional information on the failure, and should be displayed to human users.
  file(filename) { // might throw error if file doesn't exist
    this._body = fs.readFileSync(filename);
    this.status(20);
    this._setMeta(mime.getType(filename));
    return this;
  }

  input(prompt, sensitive = false) { //client should re-request same url with input as a query param
    this.status(sensitive ? 11 : 10);
    this._setMeta(prompt);
    return this;
  }

  certify(info = "Please include a certificate.") { //request certificate from client
    this._setMeta(info);
    this.status(60);
    return this;
  }

  redirect(url) {
    this.status(30);
    this._setMeta(url);
    return this;
  }

  format_header() {
    return `${this._status} ${this._meta}\r\n`;
  }
}

module.exports = Response;
