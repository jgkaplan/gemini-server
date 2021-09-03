const tls = require('tls');
const url = require('url');
const { pathToRegexp, match } = require("path-to-regexp");
const { STATUS } = require('./utils.js');
const Request = require('./Request.js');
const Response = require('./Response.js');



class Server {
    #key;
    #cert;
    #stack;
    #middlewares;

    constructor(key, cert) {
      this.#key = key;
      this.#cert = cert;
      this.#stack = [];
      this.#middlewares = [];
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
        conn.on('data', async (data) => {
          let u = url.parse(data);
          if(u.protocol !== 'gemini' && u.protocol !== 'gemini:'){
            //error
            conn.write("59 Invalid protocol.\r\n");
            conn.destroy();
            return;
          }
          let req = new Request(u, conn.getPeerCertificate());
          let res = new Response(STATUS._51, "Not Found.");
          let matched_route = null; // route in the stack that matches the request path
          let m = null;

          const isMatch = (route) => route.fast_star || route.regexp != null && (m = route.match(u.pathname));

          const middlewares = this.#middlewares.filter(isMatch);
          const middlewareHandlers = middlewares.flatMap(({ handlers }) => handlers);


          for(let route of this.#stack) {
            if(isMatch(route)){
                matched_route = route;
                req.params = m ? m.params : null;
                break;
            }
          }

          let handle = async function(handlers) {
              if(handlers.length > 0) {
                  await handlers[0](req, res, () => handle(handlers.slice(1)));
              }
          }

          handle(middlewareHandlers);


          if(matched_route === null){
            conn.destroy();
            return;
          }

          await handle(matched_route.handlers);

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
        match: path==='*'?function(){return true;}:match(path, { encode: encodeURI, decode: decodeURIComponent }),
        handlers: handlers,
        fast_star: path === '*'
      })
    }

    use(...params) {
      // Apply middlewares to path if it's given as the first argument
      const hasPath = typeof params[0] === 'string';
      const path = hasPath && params[0];

      const handlers = hasPath ? params.slice(1) : params;

      this.#middlewares.push({
        regexp: hasPath && path !== '*' ? pathToRegexp(path, [], {
                sensitive: true,
                strict: false
              }) : null,
        match: !hasPath || path === '*' ? () => true : match(path, { encode: encodeURI, decode: decodeURIComponent }),
        handlers,
        fast_star: !hasPath || path === '*',
      });
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
