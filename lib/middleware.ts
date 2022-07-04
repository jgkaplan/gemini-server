import Request from "./Request";
import TitanRequest from "./TitanRequest";
import Response from "./Response";

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
