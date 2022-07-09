import tls from "tls";
import url from "url";

export default class Request {
  url: url.URL;
  path: string | null;
  query: string | null;
  cert: tls.PeerCertificate | tls.DetailedPeerCertificate;
  fingerprint: string;
  params: Record<string, string>;
  baseUrl: string;

  constructor(u: url.URL, c: tls.PeerCertificate | tls.DetailedPeerCertificate){
    this.url = u;
    this.path = u.pathname;
    this.query = u.search?.slice(1) || null;
    this.cert = c;
    this.fingerprint = c.fingerprint;
    this.params = {};
    this.baseUrl = '';
  }
}
