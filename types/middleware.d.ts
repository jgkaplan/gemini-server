import Request from "./Request";
import Response from "./Response";

export type middleware = (
  req: Request,
  res: Response,
  next: () => void,
) => void;

export function redirect(url: string): middleware;
export function requireInput(prompt?: string): middleware;
export let requireCert: middleware;
export function serveStatic(path: string, options?: {index?: boolean, indexExtensions?: Array<string>, redirectOnDirectory?: boolean}): middleware;
