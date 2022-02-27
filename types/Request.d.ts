import tls from "tls";
import url from "url";

export = Request;
/*~ Write your module's methods and properties in this class */
declare class Request {
  constructor(
    u: url.UrlWithStringQuery,
    c: tls.PeerCertificate | tls.DetailedPeerCertificate,
  );
  url: url.UrlWithStringQuery;
  path: string | null;
  query: string | null;
  cert: tls.PeerCertificate | tls.DetailedPeerCertificate;
  fingerprint: string;
  params: Record<string, string>;
}
