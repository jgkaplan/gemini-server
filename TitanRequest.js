const Request = require("./Request");

class TitanRequest extends Request {
    constructor(u, c) {
        super(u, c);
        this.data = null;
        this.uploadSize = 0;
        this.token = null;
        this.mimeType = null;
    }
}

module.exports = TitanRequest;