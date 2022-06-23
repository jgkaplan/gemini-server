import tls from "tls";
import { Buffer } from "node";

import {
  middleware,
  titanMiddleware,
  redirect,
  requireCert,
  requireInput,
} from "./middleware";

import Request from "./Request";
import Response from "./Response";
import status from "./status";
import TitanRequest from "./TitanRequest";

export = GeminiServer;

declare function GeminiServer({ key, cert }: {
  key: string | Buffer | Array<Buffer | tls.KeyObject> | undefined;
  cert: string | Buffer | Array<string | Buffer> | undefined;
}): Server;

interface Route {
  regexp: RegExp | null;
  match: (path: string) => boolean;
  handlers: middleware[];
  fast_star: boolean;
}

declare class Server {
  constructor(
    key: string | Buffer | Array<Buffer | tls.KeyObject> | undefined,
    cert: string | Buffer | Array<string | Buffer> | undefined,
  );
  _key: string | Buffer | Array<Buffer | tls.KeyObject> | undefined;
  _cert: string | Buffer | Array<string | Buffer> | undefined;
  _stack: Route[];
  _titanStack: Route[];
  _middlewares: middleware[];
  listen(callback?: () => void, port?: number): tls.Server;
  on(path: string, ...handlers: middleware[]): void;
  use(path: string, ...params: (middleware|titanMiddleware)[]): void;
  use(...params: (middleware|titanMiddleware)[]): void;
  titan(path: string, ...handlers: titanMiddleware[]): void;
}

declare namespace GeminiServer {
  export { redirect };
  export { requireInput };
  export { requireCert };
  export { middleware };
  export { Request };
  export { TitanRequest };
  export { Response };
  export { status };
}
