import Request from "./Request";
import TitanRequest from "./TitanRequest";
import Response from "./Response";
import {promises as fs} from 'fs';
import path from 'path';

export type NextFunction = () => void;

export type middleware<R extends Request = Request> = (
  req: R,
  res: Response,
  next: NextFunction,
) => void;

export type titanMiddleware = middleware<TitanRequest>;

// export type middleware = geminiMiddleware | titanMiddleware;

export function redirect(url: string): middleware {
  return function (req: Request, res: Response) {
    res.redirect(url);
  };
};
export function requireInput(prompt: string = "Input requested"): middleware {
  return function (req: Request, res: Response, next: NextFunction) {
    if (!req.query) {
      res.input(prompt);
    } else {
      next();
    }
  };
};

export let requireCert: middleware = function (req: Request, res: Response, next: NextFunction) {
  if (!req.fingerprint) {
    res.certify();
  } else {
    next();
  }
};

type serveStaticOptions = {index?: boolean, indexExtensions?: string[], redirectOnDirectory?: boolean}

//TODO: make async, check for malicious paths
export function serveStatic(basePath: string, opts?: serveStaticOptions) : middleware {
  let options = { index: true, indexExtensions: ['.gemini', '.gmi'], redirectOnDirectory: true, ...opts }; // apply default options
  return async function (req, res, next){
    if (req.path != null && !/^[a-zA-Z0-9_\.\/-]+$/.test(req.path)) {
      res.error(59, "Forbidden characters in path");
      return;
    }
    const filePath = req.path?.replace(req.baseUrl, '') || '/';
    const safeSuffix = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    let fullPath = path.join(basePath, safeSuffix);
    try {
      let stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        if (!filePath.endsWith('/')) {
          if (options.redirectOnDirectory) {
            res.redirect(req.path + '/');
            return;
          } else {
            throw Error("Not a file but a directory");
          }
        }
        if (options.index) {
          let extension = options.indexExtensions.findIndex(async function(ext){
            try {
              await fs.access(fullPath + 'index' + ext);
              return true;
            } catch {
              return false;
            }
          });
          if (extension !== -1) {
            res.file(fullPath + 'index' + options.indexExtensions[extension]);
            return;
          }
        }
      }
      if (stat.isFile()) {
        res.file(fullPath);
        return;
      }
    } catch (_e) {
      res.status(51);
      next();
    }
  };
};
