const fs = require("fs");

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

module.exports.serveStatic = function (path, options) {
  options = { index: true, indexExtensions: ['.gemini', '.gmi'], redirectOnDirectory: true, ...options }; // apply default options
  if (!path.startsWith("./")) {
    path = "./" + path;
  }
  return function (req, res, next) {
    let filePath = req.path.replace(req.baseUrl, '') || '/';
    let fullPath = path + filePath;
    try {
      let stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!filePath.endsWith('/')) {
          if (options.redirectOnDirectory) {
            return res.redirect(req.path + '/');
          } else {
            throw Error("Not a file but a directory");
          }
        }
        if (options.index) {
          let extension = options.indexExtensions.findIndex(ext => fs.existsSync(fullPath + 'index' + ext));
          if (extension !== -1) {
            return res.file(fullPath + 'index' + options.indexExtensions[extension]);
          }
        }
      }
      if (stat.isFile()) {
        return res.file(fullPath);
      }
    } catch (_e) {
      res.status(51);
      next();
    }
  };
};
