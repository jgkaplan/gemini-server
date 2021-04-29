import tls, { SecureContextOptions } from "tls"
import url from "url"
import { pathToRegexp, match, MatchFunction } from "path-to-regexp"
import { STATUS } from "./utils"
import Request from "./request"
import Response from "./response"

type Handler = (req: Request, res: Response, next: () => void) => void | Promise<void>
type StackElem = {
    regexp: RegExp | null
    match: (() => boolean) | MatchFunction<object>
    handlers: Handler[]
    fast_star: boolean
}

class Server {
    private key: SecureContextOptions["key"]
    private cert: SecureContextOptions["cert"]
    private stack: StackElem[]
    tlsServer: tls.Server

    constructor(key: SecureContextOptions["key"], cert: SecureContextOptions["cert"]) {
        this.tlsServer = tls.createServer(
            {
                key,
                cert,
                requestCert: true,
                rejectUnauthorized: false,
            },
            conn => {
                conn.setEncoding("utf8")

                conn.on("data", async data => {
                    let u = url.parse(data)
                    if (u.protocol !== "gemini" && u.protocol !== "gemini:") {
                        //error
                        conn.write("59 Invalid protocol.\r\n")
                        conn.destroy()
                        return
                    }

                    let req = new Request(u, conn.getPeerCertificate())
                    let res = new Response(STATUS._51, "Not Found.")

                    let matched_route: StackElem | null = null // route in the stack that matches the request path
                    let m = null

                    for (let route of this.stack) {
                        if (
                            route.fast_star ||
                            (route.regexp != null && (m = route.match(req.path)))
                        ) {
                            matched_route = route
                            req.params = m instanceof Object ? m.params : null
                            break
                        }
                    }

                    if (matched_route === null) {
                        conn.destroy()
                        return
                    }

                    for (const handler of matched_route.handlers) {
                        const cont = await new Promise<boolean>(async (resolve, reject) => {
                            const maybePromise = handler(req, res, () => {
                                resolve(true)
                            })
                            if (maybePromise instanceof Promise) await maybePromise
                            resolve(false)
                        })
                        if (!cont) break
                    }

                    conn.write(res.format_header())
                    if (res.getStatus() == STATUS._20) {
                        //send body
                        conn.write(res.format_body())
                        conn.end()
                    } else {
                        conn.destroy()
                    }
                })
            }
        )

        this.key = key
        this.cert = cert
        this.stack = []
    }

    listen(callback: (() => void) | undefined = undefined, port = 1965): this {
        this.tlsServer.listen(port, callback)

        return this
    }

    on(path: string, ...handlers: Handler[]) {
        this.stack.push({
            regexp:
                path === "*"
                    ? null
                    : pathToRegexp(path, [], {
                          sensitive: true,
                          strict: false,
                      }),
            match:
                path === "*"
                    ? function () {
                          return true
                      }
                    : match(path, { encode: encodeURI, decode: decodeURIComponent }),
            handlers: handlers,
            fast_star: path === "*",
        })
    }
}

export function redirect(url: string) {
    return function (req: Request, res: Response) {
        res.redirect(url)
    }
}

// It's probably not the best idea to call a function "static"
// export function static(path: string, options = { dotfiles: false, index: false }) {}

export function requireInput(prompt: string = "Input requested") {
    return function (req, res, next) {
        if (!req.query) {
            res.input(prompt)
        } else {
            next()
        }
    } as Handler
}

export function requireCert(req: Request, res: Response, next: () => void) {
    if (!req.fingerprint) {
        res.certify()
    } else {
        next()
    }
}

export { STATUS }

export const createServer = ({
    key,
    cert,
}: {
    key: SecureContextOptions["key"]
    cert: SecureContextOptions["cert"]
}) => {
    if (!key || !cert) {
        throw "Must specify key and cert"
    }
    return new Server(key, cert)
}
