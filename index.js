const tls = require("tls");
const url = require("url");
const { pathToRegexp, match } = require("path-to-regexp");
const Request = require("./Request.js");
const Response = require("./Response.js");
const middleware = require("./middleware.js");
const truncate = require("truncate-utf8-bytes");

class Server {
  _key;
  _cert;
  _titan;
  _stack;
  _middlewares;

  constructor(key, cert, titan) {
    this._key = key;
    this._cert = cert;
    this._titan = titan;
    this._stack = [];
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
      let titanParams = { uploadSize: 0, token: null, mime: null };
      let protocol = "gemini";
      conn.on("data", async (data) => {
        byteCount += data.length
        // data is Buffer | String
        // data can be incomplete
        // Store data until we receive <CR><LF>
        if (isURLReceived && byteCount < (ulength + titanParams.uploadSize)) return;

        chunks.push(data);
        if (!data.toString("utf8").includes('\r\n')) return;

        //A url is at most 1024 bytes followed by <CR><LF>
        let uStr = truncate(Buffer.concat(chunks).toString("utf-8").split(/\r\n/, 1)[0], 1024);
        if (!u) { 
          u = new url.URL(uStr.split(';')[0]);
          ulength = uStr.length + 2;
          isURLReceived = true;
          if (["titan", "titan:"].includes(u.protocol) && this._titan) {
            protocol = "titan";
            let t = uStr.split(';').slice(1).reduce((acc, curr) => {let param = curr.split('='); acc[param[0]] = param[1]; return acc}, {});
            titanParams.uploadSize = parseInt(t['size']) || 0;
            titanParams.token = t['token'] || null;
            titanParams.mime = t['mime'] || null;
            if (byteCount < (ulength + titanParams.uploadSize)) return;
          }
        }
        if (!this._titan && !["gemini", "gemini:"].includes(u.protocol) || this._titan && !["gemini", "gemini:", "titan", "titan:"].includes(u.protocol)) {
          //error
          conn.write("59 Invalid protocol.\r\n");
          conn.destroy();
          return;
        }
        const req = new Request(u, conn.getPeerCertificate(), protocol);
        let concatenatedBuffer = Buffer.concat(chunks);
        if (titanParams.uploadSize > 0) req.data = Buffer.from(concatenatedBuffer.slice(concatenatedBuffer.indexOf("\r\n") + 2));
        if (protocol === "titan") req.titanParams = titanParams;
        const res = new Response(51, "Not Found.");
        let matched_route = null; // route in the stack that matches the request path
        let m = null;

        const isMatch = (route) =>
          route.fast_star ||
          route.regexp != null && (m = route.match(u.pathname));

        const middlewareMatches = this._middlewares.filter(isMatch);

        for (const route of this._stack) {
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

        const handleMiddlewares = async function (middlewares) {
          if (middlewares.length > 0) {
            req.baseUrl += middlewares[0].match(u.pathname).path || '';
            await handle(middlewares[0].handlers);
            await handleMiddlewares(middlewares.slice(1));
          }
        }

        await handleMiddlewares(middlewareMatches);

        if (matched_route === null && (res._body === null && res.getStatus() == 20)) {
          conn.destroy();
          return;
        } else if (matched_route !== null) {
          await handle(matched_route.handlers);
        }
        
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
      mountPath: hasPath ? path : null,
    });
  }
}

// function static(path, options = { dotfiles: false, index: false }) {
// }

module.exports = ({ key, cert, titan = false }) => {
  if (!key || !cert) {
    throw new Error("Must specify key and cert");
  }
  return new Server(key, cert, titan);
};
// module.exports.static = static;
module.exports.Request = Request;
module.exports.Response = Response;
module.exports.redirect = middleware.redirect;
module.exports.requireCert = middleware.requireCert;
module.exports.requireInput = middleware.requireInput;
module.exports.serveStatic = middleware.serveStatic;
