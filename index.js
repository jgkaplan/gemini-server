const tls = require('tls');
const url = require('url');
const mime = require('mime');
const fs = require('fs');
const { pathToRegexp } = require("path-to-regexp");
const truncate = require("truncate-utf8-bytes")

mime.define({'text/gemini': ['gemini', 'gmi']})

const STATUS = {
    _10: 10, //input
    _11: 11, //sensitive input
    _20: 20, //success
    _30: 30, //redirect - temporary
    _31: 31, //redirect - permanent
    _40: 40, //temporary failure
    _41: 41, //server unavailable
    _42: 42, //CGI error
    _43: 43, //proxy error
    _44: 44, //slow down
    _50: 50, //permanent failure
    _51: 51, //not found
    _52: 52, //gone
    _53: 53, //proxy request refused
    _59: 59, //bad request
    _60: 60, //client certificate required
    _61: 61, //client certificate not authorized
    _62: 62  //client certificate not valid
}

class Request {
  constructor(u){
    this.url = u;
    this.path = u.pathname;
    this.query = u.query;
  }
  //certificate
}

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

class Server {
    #key;
    #cert;
    #stack;

    constructor(key, cert) {
      this.#key = key;
      this.#cert = cert;
      this.#stack = [];
    }

    listen(callback=null, port=1965){
      //try catch the handler. if error, respond with error
      let s = tls.createServer({key: this.#key, cert: this.#cert}, (conn) => {
        conn.setEncoding('utf8');
        conn.on('data', (data) => {
          let u = url.parse(data);
          if(u.protocol !== 'gemini' && u.protocol !== 'gemini:'){
            //error
            conn.write("59 Invalid protocol.\r\n");
            conn.destroy();
            return;
          }
          let req = new Request(u);
          let res = new Response(STATUS._51, "Not Found.");
          for(let route of this.#stack) {
            if(route.fast_star || route.regexp != null && route.regexp.exec(u.pathname)){
              route.handler(req, res);
              break;
            }
          }
          conn.write(res.format_header());
          if(res.getStatus() == STATUS._20){
            //send body
            conn.write(res.format_body());
            conn.end();
          }else{
            conn.destroy();
          }
        })
      });
      s.listen(port, callback);

    }

    on(path, handler){ //path: string, handler: (Request * Response) -> null
      this.#stack.push({
        regexp: path==='*'?null:pathToRegexp(path, [], {
                sensitive: true,
                strict: false
              }),
        handler: handler,
        fast_star: path === '*'
      })
    }
}

function static(dir){
  //automatically serve index.gemini
  return function(req, res){
    //TODO: match url in req and serve the proper file from dir, or 404
  }
}

function redirect(url){
  return function(req, res){
    res.redirect(url);
  }
}

module.exports = ({key, cert}) => {
  if(!key || !cert){
    throw "Must specify key and cert"
  }
  return new Server(key, cert);
};
module.exports.STATUS = STATUS;
module.exports.static = static;
module.exports.redirect = redirect;
