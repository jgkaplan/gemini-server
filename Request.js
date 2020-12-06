class Request {
  constructor(u, c){
    this.url = u;
    this.path = u.pathname;
    this.query = u.query;
    this.cert = c;
    this.fingerprint = c.fingerprint;
  }
}

module.exports = Request;
