import { UrlWithStringQuery } from "url"
import { PeerCertificate } from "tls"

export default class Request {
    url: UrlWithStringQuery
    path: string
    query: string | null
    cert: PeerCertificate
    fingerprint: string
    params: any

    constructor(u: UrlWithStringQuery, c: PeerCertificate) {
        this.url = u
        this.path =
            u.pathname ??
            (() => {
                throw "Could not find path."
            })()
        this.query = u.query
        this.cert = c
        this.fingerprint = c.fingerprint
        this.params = {}
    }
}
