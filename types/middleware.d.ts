import Request from "./Request.d.ts";
import Response from "./Response.d.ts";

export type middleware = (
  req: Request,
  res: Response,
  next: middleware,
) => void;

export function redirect(url: string): middleware;
export function requireInput(prompt?: string): middleware;
export let requireCert: middleware;
