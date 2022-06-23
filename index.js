const tls = require("tls");
const url = require("url");
const { pathToRegexp, match } = require("path-to-regexp");
const Request = require("./Request.js");
const Response = require("./Response.js");
const TitanRequest = require("./TitanRequest");
const middleware = require("./middleware.js");
const truncate = require("truncate-utf8-bytes");

class Server {
  _key;
  _cert;
  _stack;
  _titanStack
  _middlewares;

  constructor(key, cert) {
    this._key = key;
    this._cert = cert;
    this._stack = [];
    this._titanStack = [];
    this._middlewares = [];
  }

  listen(callback = null, port = 1965) {
    //try catch the handler. if error, respond with error
    const s = tls.createServer({
      key: this._key,
      cert: this._cert,
      requestCert: true,
      rejectUnauthorized: false,
    }, (conn) => {
      conn.on("error", (err) => {
        if (err && err.code === "ECONNRESET") return;
        console.error(err);
      });
      const chunks = [];
      let byteCount = 0;
      let isURLReceived = false;
      let u, ulength;
      let titanSize = 0;
      let protocol = "gemini";
      conn.on("data", async (data) => {
        // Route Matcher, checks whether a route matches the path
        let m = null;
        const isMatch = (route) =>
          route.fast_star ||
          route.regexp != null && (m = route.match(u.pathname));


        byteCount += data.length
        // data is Buffer | String
        // data can be incomplete
        // Store data until we receive <CR><LF>
        if (isURLReceived && byteCount < (ulength + titanSize)) return;

        chunks.push(data);
        if (!data.toString("utf8").includes('\r\n')) return;

        //A url is at most 1024 bytes followed by <CR><LF>
        let uStr = truncate(Buffer.concat(chunks).toString("utf-8").split(/\r\n/, 1)[0], 1024);
        if (!u) { 
          u = new url.URL(uStr.split(';')[0]);
          ulength = uStr.length + 2;
          isURLReceived = true;
          if (!["gemini", "gemini:", "titan", "titan:"].includes(u.protocol)) {
            //error
            conn.write("59 Invalid protocol.\r\n");
            conn.destroy();
            return;
          }
          if (["titan", "titan:"].includes(u.protocol)) {
            protocol = "titan";
            let t = uStr.split(';').slice(1).reduce((acc, curr) => {let param = curr.split('='); acc[param[0]] = param[1]; return acc}, {});
            titanSize = parseInt(t['size']) || 0;
            if (this._titanStack.some(isMatch)) { // Stop listening when no titan handler exists
              if (byteCount < (ulength + titanSize)) return;
            }
          }
        }
        let req;
        if (protocol == "titan") {
          req = new TitanRequest(u, conn.getPeerCertificate());
          let concatenatedBuffer = Buffer.concat(chunks);
          if (titanSize > 0) req.data = Buffer.from(concatenatedBuffer.slice(concatenatedBuffer.indexOf("\r\n") + 2));
          let t = uStr.split(';').slice(1).reduce((acc, curr) => {let param = curr.split('='); acc[param[0]] = param[1]; return acc}, {});
          console.log(req.data.toString("utf-8"))
          req.uploadSize = titanSize;
          req.token = t['token'] || null;
          req.mimeType = t['mime'] || null;
        } else {
          req = new Request(u, conn.getPeerCertificate());
        }
        
        const res = new Response(51, "Not Found.");
        let matched_route = null; // route in the stack that matches the request path
        const middlewares = this._middlewares.filter(isMatch);
        const middlewareHandlers = middlewares.flatMap(({ handlers }) =>
          handlers
        );

        for (const route of (protocol == "gemini" ? this._stack : this._titanStack)) {
          if (isMatch(route)) {
            matched_route = route;
            req.params = m ? m.params : null;
            break;
          }
        }

        const handle = async function (handlers) {
          if (handlers.length > 0) {
            await handlers[0](req, res, () => handle(handlers.slice(1)));
          }
        };

        await handle(middlewareHandlers);

        if (matched_route === null) {
          conn.write(res.format_header());
          conn.destroy();
          return;
        }

        await handle(matched_route.handlers);

        conn.write(res.format_header());
        if (res.getStatus() == 20) {
          //send body
          conn.write(res._body);
          conn.end();
        } else {
          conn.destroy();
        }
      });
    });

    return s.listen(port, callback);
  }

  on(path, ...handlers) { //path: string, handler: (Request * Response) -> null
    this._stack.push({
      regexp: path === "*" ? null : pathToRegexp(path, [], {
        sensitive: true,
        strict: false,
        end: true
      }),
      match: path === "*"
        ? function () {
          return true;
        }
        : match(path, { encode: encodeURI, decode: decodeURIComponent }),
      handlers: handlers,
      fast_star: path === "*",
    });
  }

  titan(path, ...handlers) {
    this._titanStack.push({
      regexp: path === "*" ? null : pathToRegexp(path, [], {
        sensitive: true,
        strict: false,
        end: true
      }),
      match: path === "*"
        ? function () {
          return true;
        }
        : match(path, { encode: encodeURI, decode: decodeURIComponent }),
      handlers: handlers,
      fast_star: path === "*",
    })

  }

  use(...params) {
    // Apply middlewares to path if it's given as the first argument
    const hasPath = typeof params[0] === "string";
    const path = hasPath && params[0];

    const handlers = hasPath ? params.slice(1) : params;

    this._middlewares.push({
      regexp: hasPath && path !== "*"
        ? pathToRegexp(path, [], {
          sensitive: true,
          strict: false,
          end: false
        })
        : null,
      match: !hasPath || path === "*"
        ? () => true
        : match(path, { encode: encodeURI, decode: decodeURIComponent, end: false }),
      handlers,
      fast_star: !hasPath || path === "*",
    });
  }
}

// function static(path, options = { dotfiles: false, index: false }) {
// }

module.exports = ({ key, cert }) => {
  if (!key || !cert) {
    throw new Error("Must specify key and cert");
  }
  return new Server(key, cert);
};
// module.exports.static = static;
module.exports.Request = Request;
module.exports.TitanRequest = TitanRequest
module.exports.Response = Response;
module.exports.redirect = middleware.redirect;
module.exports.requireCert = middleware.requireCert;
module.exports.requireInput = middleware.requireInput;
