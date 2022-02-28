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
  _stack;
  _middlewares;

  constructor(key, cert) {
    this._key = key;
    this._cert = cert;
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
      conn.setEncoding("utf8");
      conn.on("error", (err) => {
        if (err && err.code === "ECONNRESET") return;
        console.error(err);
      });
      const chunks = [];
      let isDataReceived = false;
      conn.on("data", async (data) => {
        // data is Buffer | String
        // data can be incomplete
        // Store data until we receive <CR><LF>
        if (isDataReceived) return;

        chunks.push(data);
        if (!chunks.join('').includes('\r\n')) return;
        isDataReceived = true;

        //A url is at most 1024 bytes followed by <CR><LF>
        let u = new url.URL(truncate(chunks.join('').split('\r\n', 1)[0], 1024));
        if (u.protocol !== "gemini" && u.protocol !== "gemini:") {
          //error
          conn.write("59 Invalid protocol.\r\n");
          conn.destroy();
          return;
        }
        const req = new Request(u, conn.getPeerCertificate());
        const res = new Response(51, "Not Found.");
        let matched_route = null; // route in the stack that matches the request path
        let m = null;

        const isMatch = (route) =>
          route.fast_star ||
          route.regexp != null && (m = route.match(u.pathname));

        const middlewares = this._middlewares.filter(isMatch);
        const middlewareHandlers = middlewares.flatMap(({ handlers }) =>
          handlers
        );

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

        await handle(middlewareHandlers);

        if (matched_route === null) {
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
module.exports.Response = Response;
module.exports.redirect = middleware.redirect;
module.exports.requireCert = middleware.requireCert;
module.exports.requireInput = middleware.requireInput;
