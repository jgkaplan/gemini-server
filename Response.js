const truncate = require("truncate-utf8-bytes")
const mime = require('mime');
const fs = require('fs');
const { STATUS } = require('./utils.js');

mime.define({'text/gemini': ['gemini', 'gmi']})

class Response {
    #status = null;
    #meta = "";
    #body = null;

    #setMeta(m){
      this.#meta = truncate(m, 1024);
    }
    constructor(status = null, meta = null){
      this.#status = status;
      this.#setMeta(meta);
    }

    status(s){
      this.#status = s;
      return this;
    }

    getStatus(){
      return this.#status;
    }

    data(d, mimeType='text/plain'){
      this.status(STATUS._20);
      this.#body = d;
      this.#setMeta(mimeType);
      return this;
    }
    //for success, The <META> line is a MIME media type which applies to the response body.
    //for redirect, <META> is a new URL for the requested resource. The URL may be absolute or relative.
    //for 4* and 5*, The contents of <META> may provide additional information on the failure, and should be displayed to human users.
    file(filename){ // might throw error if file doesn't exist
      this.#body = fs.readFileSync(filename);
      this.status(STATUS._20);
      this.#setMeta(mime.getType(filename));
      return this;
    }

    input(prompt, sensitive=false){ //client should re-request same url with input as a query param
      this.status(sensitive?STATUS._11:STATUS._10);
      this.#setMeta(prompt);
      return this;
    }

    certify(info="Please include a certificate."){ //request certificate from client
      this.#setMeta(info);
      this.status(STATUS._60);
      return this;
    }

    redirect(url){
      this.status(STATUS._30);
      this.#setMeta(url);
    }

    format_header(){
      return `${this.#status} ${this.#meta}\r\n`;
    }

    format_body(){
      return `${this.#body}\r\n`;
    }
}

module.exports = Response;
