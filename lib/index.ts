import tls from "tls";
import url, { URL } from "url";
import {
  middleware,
  serveStatic,
  titanMiddleware,
} from "./middleware";
import { pathToRegexp, match, MatchFunction } from "path-to-regexp";
import Request from "./Request.js";
import Response from "./Response.js";
import TitanRequest from "./TitanRequest";
import truncate from "truncate-utf8-bytes";

type Route<R extends Request = Request> = {
  regexp: RegExp | null;
  match: MatchFunction<Record<string, string>>;
  handlers: middleware<R>[];
  fast_star: boolean;
  mountPath: string | null;
}

type RouteNoHandlers = Omit<Route, "handlers">;

type titanParams = {size: number, mime: string|null, token: string|null}

function starMatch() {
  return {
    path: "*",
    index: 0,
    params: {}
  };
}

class Server {
  _key: string | Buffer | Array<Buffer | tls.KeyObject> | undefined;
  _cert: string | Buffer | Array<string | Buffer> | undefined;
  _stack: Route<Request>[];
  _titanStack: Route<TitanRequest>[];
  _middlewares: Route[];
  _titanEnabled: boolean;

  constructor(key: string | Buffer | Array<Buffer | tls.KeyObject>,
              cert: string | Buffer | Array<string | Buffer>,
              titanEnabled: boolean = false) {
    this._key = key;
    this._cert = cert;
    this._stack = [];
    this._titanStack = [];
    this._middlewares = [];
    this._titanEnabled = titanEnabled;
  }

  listen(port: number, callback?: (() => void)): tls.Server;
  listen(callback?: (() => void)): tls.Server;
  listen(portOrCallback: number | (() => void) = 1965, callback?: (() => void)): tls.Server {
    let port = 1965;
    if(typeof portOrCallback === "number"){
      port = portOrCallback;
    }else{
      callback = portOrCallback;
    }
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
      const chunks: any = [];
      let byteCount = 0;
      let isURLReceived = false;
      let t : titanParams = {
        token: null,
        size: 0,
        mime: null
      };
      let u: URL, ulength: number;
      let protocol : "gemini" | "titan" = "gemini";
      conn.on("data", async (data : any) => {
        // Route Matcher, checks whether a route matches the path
        const getMatch = (route: RouteNoHandlers) =>
          route.fast_star ||
          route.regexp != null && route.match(u.pathname as string); //TODO: move this to after u is defined?
        const isMatch = (route: RouteNoHandlers) => getMatch(route) != false;

        byteCount += data.length
        // data is Buffer | String
        // data can be incomplete
        // Store data until we receive <CR><LF>
        if (isURLReceived && byteCount < (ulength + t.size)) return;

        chunks.push(data);
        if (!data.toString("utf8").includes('\r\n')) return;

        //A url is at most 1024 bytes followed by <CR><LF>
        let uStr = truncate(Buffer.concat(chunks).toString("utf-8").split(/\r\n/, 1)[0], 1024);
        let req : Request | TitanRequest;
        if (!u) { 
          // This pattern matches a string that starts with any of the HTTP methods, 
          // followed by an optional "http://" or "https://" protocol, 
          // one or more word characters, a dot, one or more word characters, 
          // zero or more forward slashes and word characters, another space, 
          // "HTTP/", a digit, a period, and another digit. 
          // If the `test()` method returns `true`, we know that the string contains 
          // an HTTP or HTTPS URL.
          const HTTPRegex = /^(GET|POST|PUT|DELETE|HEAD|OPTIONS)\s(https?:\/\/)?\S+\sHTTP\/\d\.\d$/;
          if (HTTPRegex.test(uStr)){
            // Maybe remove these console logs
            console.log("Ignoring an HTTP request:");
            console.log(uStr);
            return;
          }
          u = new url.URL(uStr.split(';')[0]);
          ulength = uStr.length + 2;
          isURLReceived = true;
          req = new Request(u, conn.getPeerCertificate());
          if (!["gemini", "gemini:", "titan", "titan:"].includes(u.protocol as string) || ["titan", "titan:"].includes(u.protocol as string) && !this._titanEnabled) {
            //error
            conn.write("59 Invalid protocol.\r\n");
            conn.destroy();
            return;
          }
          if (["titan", "titan:"].includes(u.protocol as string)) {
            protocol = "titan";
          }else{
            protocol = "gemini";
          }
        }else{
          return;
        }
        if (protocol == "titan") {
          let titanreq = new TitanRequest(u, conn.getPeerCertificate());
          let concatenatedBuffer = Buffer.concat(chunks);
          
          for(const param of uStr.split(';').slice(1)){
            let [k,v] = param.split('=');
            if(k === "token" || k === "mime"){
              t[k] = v;
            } else if (k === "size"){
              t[k] = parseInt(v) || 0;
            }
            
          }
          if (this._titanStack.some(isMatch) && (byteCount < (ulength + t.size))) return; // Stop listening when no titan handler exists
          // console.log(titanreq.data.toString("utf-8"))
          if (t.size > 0) titanreq.data = Buffer.from(concatenatedBuffer.slice(concatenatedBuffer.indexOf("\r\n") + 2));
          titanreq.uploadSize = t.size;
          titanreq.token = t.token;
          titanreq.mimeType = t.mime;
          req = titanreq;
        } else {
          req = new Request(u, conn.getPeerCertificate());
        }
        
        const res = new Response(51, "Not Found.");
        const middlewares = this._middlewares.filter(isMatch);
        // const middlewareHandlers = middlewares.flatMap(({ handlers }) =>
        //   handlers
        // );
        

        async function handle<R extends (Request | TitanRequest)>(handlers: middleware<R>[], request: R) {
          if (handlers.length > 0) {
            await handlers[0](request, res, () => handle(handlers.slice(1), request));
          }
        };
        async function handleMiddleware<R extends (Request | TitanRequest)>(m : Route<R>[], request: R) {
          if (m.length > 0) {
            request.baseUrl = m[0].mountPath || '';
            await handle<R>(m[0].handlers, request);
            await handleMiddleware<R>(m.slice(1), request);
          }
        }

        await handleMiddleware<Request>(middlewares, req);

        // await handle<Request>(middlewareHandlers, req);

        if(protocol === "gemini"){
          for (const route of this._stack) {
            if (isMatch(route)) {
              let m = getMatch(route);
              if(typeof m !== "boolean"){
                req.params = m.params;
              }
              await handle<Request>(route.handlers, req);
              break;
            }
          }
        }else{
          for (const route of this._titanStack) {
            if (isMatch(route)) {
              let m = getMatch(route);
              if(typeof m !== "boolean"){
                req.params = m.params;
              }
              await handle<TitanRequest>(route.handlers, req as TitanRequest);
              break;
            }
          }
        }
        
        conn.write(res.format_header());
        if (res.getStatus() == 20 && res._body != null) {
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

  on(path: string, ...handlers: middleware[]): void {
    this._stack.push({
      regexp: path === "*" ? null : pathToRegexp(path, [], {
        sensitive: true,
        strict: false,
        end: true
      }),
      match: path === "*"
        ? starMatch
        : match(path, { encode: encodeURI, decode: decodeURIComponent }),
      handlers: handlers,
      fast_star: path === "*",
      mountPath: path
    });
  }

  titan(path: string, ...handlers: titanMiddleware[]): void {
    this._titanEnabled = true;
    this._titanStack.push({
      regexp: path === "*" ? null : pathToRegexp(path, [], {
        sensitive: true,
        strict: false,
        end: true
      }),
      match: path === "*"
        ? starMatch
        : match(path, { encode: encodeURI, decode: decodeURIComponent }),
      handlers: handlers,
      fast_star: path === "*",
      mountPath: path
    });
  }

  //TODO: make use allow titan middleware?
  use(...params: middleware[]): void;
  use(path: string, ...params: middleware[]): void;
  use(pathOrMiddleware: string | middleware, ...params: middleware[]): void {
    if(typeof pathOrMiddleware == "string"){
      this._middlewares.push({
        regexp: pathOrMiddleware !== "*"
          ? pathToRegexp(pathOrMiddleware, [], {
            sensitive: true,
            strict: false,
            end: false
          })
          : null,
        match: pathOrMiddleware === "*"
          ? starMatch
          : match(pathOrMiddleware, { encode: encodeURI, decode: decodeURIComponent, end: false }),
        handlers: params,
        fast_star: pathOrMiddleware === "*",
        mountPath: pathOrMiddleware,
      });
    } else {
      this._middlewares.push({
        regexp: null,
        match: starMatch,
        handlers: [pathOrMiddleware, ...params],
        fast_star: true,
        mountPath: null
      });
    }
  }
}

type ServerOptions = {
  key: string | Buffer | Array<Buffer | tls.KeyObject>;
  cert: string | Buffer | Array<string | Buffer>;
  titanEnabled?: boolean
}

export default function GeminiServer({key, cert, titanEnabled=false}: ServerOptions) : Server {
  if (!key || !cert) {
    throw new Error("Must specify key and cert");
  }
  return new Server(key, cert, titanEnabled);
}

export {default as Request} from "./Request";
export {default as TitanRequest} from "./TitanRequest";
export {default as Response} from "./Response";
export {titanMiddleware, middleware, NextFunction} from "./middleware";
export { status } from "./status";

import {redirect, requireInput, requireCert} from './middleware';
GeminiServer.redirect = redirect;
GeminiServer.requireInput = requireInput;
GeminiServer.requireCert = requireCert;
GeminiServer.serveStatic = serveStatic;