const tls = require('tls');
const url = require('url');
const { pathToRegexp } = require("path-to-regexp");
const { STATUS } = require('./utils.js');
const Request = require('./Request.js');
const Response = require('./Response.js');



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
      let s = tls.createServer({
        key: this.#key,
        cert: this.#cert,
        requestCert: true,
		    rejectUnauthorized: false
      }, (conn) => {
        conn.setEncoding('utf8');
        conn.on('data', (data) => {
          let u = url.parse(data);
          if(u.protocol !== 'gemini' && u.protocol !== 'gemini:'){
            //error
            conn.write("59 Invalid protocol.\r\n");
            conn.destroy();
            return;
          }
          let req = new Request(u, conn.getPeerCertificate());
          let res = new Response(STATUS._51, "Not Found.");
          for(let route of this.#stack) {
            if(route.fast_star || route.regexp != null && route.regexp.exec(u.pathname)){
              let handle = function(index){
                if(route.handlers.length > index){
                  route.handlers[index](req, res, function(){handle(index + 1)})
                }
              }
              handle(0);
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

    on(path, ...handlers){ //path: string, handler: (Request * Response) -> null
      this.#stack.push({
        regexp: path==='*'?null:pathToRegexp(path, [], {
                sensitive: true,
                strict: false
              }),
        handlers: handlers,
        fast_star: path === '*'
      })
    }
}

function redirect(url){
  return function(req, res){
    res.redirect(url);
  }
}



function static(path, options={dotfiles: false, index: false}){

}

function requireInput(prompt="Input requested"){
  return function(req, res, next){
    if(!req.query){
      res.input(prompt);
    }else{
      next();
    }
  }
}

function requireCert(req, res, next){
  if(!req.fingerprint){
    res.certify();
  }else{
    next();
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
module.exports.requireCert = requireCert;
module.exports.requireInput = requireInput;
