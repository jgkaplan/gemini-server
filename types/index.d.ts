import tls from "tls";
import { Buffer } from "node";

import {
  middleware,
  redirect,
  requireCert,
  requireInput,
  serveStatic,
} from "./middleware";

import Request from "./Request";
import Response from "./Response";
import status from "./status";

declare function GeminiServer({ key, cert }: {
  key: string | Buffer | Array<Buffer | tls.KeyObject> | undefined;
  cert: string | Buffer | Array<string | Buffer> | undefined;
}): Server;

declare class Server {
  constructor(
    key: string | Buffer | Array<Buffer | tls.KeyObject> | undefined,
    cert: string | Buffer | Array<string | Buffer> | undefined,
  );
  _key: string | Buffer | Array<Buffer | tls.KeyObject> | undefined;
  _cert: string | Buffer | Array<string | Buffer> | undefined;
  _stack: {
    regexp: RegExp | null;
    match: (path: string) => boolean;
    handlers: middleware[];
    fast_star: boolean;
  }[];
  _middlewares: middleware[];
  listen(callback?: () => void, port?: number): tls.Server;
  on(path: string, ...handlers: middleware[]): void;
  use(path: string, ...params: middleware[]): void;
  use(...params: middleware[]): void;
}

declare namespace GeminiServer {
  export { 
    redirect,
    requireInput,
    requireCert,
    serveStatic,
    middleware,
    Request,
    Response,
    status,
  }
}

export = GeminiServer;
