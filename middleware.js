module.exports.redirect = function (url) {
  return function (req, res) {
    res.redirect(url);
  };
};

module.exports.requireInput = function (prompt = "Input requested") {
  return function (req, res, next) {
    if (!req.query) {
      res.input(prompt);
    } else {
      next();
    }
  };
};

module.exports.requireCert = function (req, res, next) {
  if (!req.fingerprint) {
    res.certify();
  } else {
    next();
  }
};
