class Request {
  constructor(u, c, p){
    this.url = u;
    this.path = u.pathname;
    this.query = u.search.slice(1);
    this.cert = c;
    this.fingerprint = c.fingerprint;
    this.params = {};
    this.baseUrl = '';
    this.data = null;
    this.titanParams = {};
    this.protocol = p;
  }
}

module.exports = Request;
