import truncate from "truncate-utf8-bytes"
import mime from "mime"
import fs from "fs"
import { STATUS } from "./utils.js"

mime.define({ "text/gemini": ["gemini", "gmi"] })

export default class Response {
    private _status: number | null = null
    private _meta: string | null = ""
    private _body: Buffer | string | null = null

    private setMeta(m: string | null) {
        this._meta = truncate(m ?? "", 1024)
    }
    constructor(status: number | null = null, meta: string | null = null) {
        this._status = status
        this.setMeta(meta)
    }

    setStatus(s: number | null) {
        this._status = s
        return this
    }

    getStatus() {
        return this._status
    }

    data(d: Buffer | string, mimeType = "text/plain") {
        this.setStatus(STATUS._20)
        this._body = d
        this.setMeta(mimeType)
        return this
    }
    //for success, The <META> line is a MIME media type which applies to the response body.
    //for redirect, <META> is a new URL for the requested resource. The URL may be absolute or relative.
    //for 4* and 5*, The contents of <META> may provide additional information on the failure, and should be displayed to human users.
    file(filename: string) {
        // might throw error if file doesn't exist
        this._body = fs.readFileSync(filename)
        this.setStatus(STATUS._20)
        this.setMeta(mime.getType(filename))
        return this
    }

    input(prompt: string, sensitive = false) {
        //client should re-request same url with input as a query param
        this.setStatus(sensitive ? STATUS._11 : STATUS._10)
        this.setMeta(prompt)
        return this
    }

    certify(info: string = "Please include a certificate.") {
        //request certificate from client
        this.setMeta(info)
        this.setStatus(STATUS._60)
        return this
    }

    redirect(url: string) {
        this.setStatus(STATUS._30)
        this.setMeta(url)
    }

    format_header() {
        return `${this._status} ${this._meta}\r\n`
    }

    format_body() {
        return `${this._body}\r\n`
    }
}
