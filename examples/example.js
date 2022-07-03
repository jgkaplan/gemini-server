"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var fs_1 = require("fs");
var index_1 = __importStar(require("./lib/index"));
var options = {
    cert: (0, fs_1.readFileSync)("cert.pem"),
    key: (0, fs_1.readFileSync)("key.pem"),
    titanEnabled: true
};
var app = (0, index_1["default"])(options);
app.use(function (req, _res, next) {
    console.log("Handling path", req.path);
    next();
});
app.on("/", function (_req, res) {
    res.file("test.gemini");
});
app.on("/input", function (req, res) {
    if (req.query) {
        res.data("you typed " + req.query);
    }
    else {
        res.input("type something");
    }
});
app.on("/paramTest/:foo", function (req, res) {
    res.data("you went to " + req.params.foo);
});
app.on("/async", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if (req.query) {
            setTimeout(function () {
                res.data("you typed " + req.query);
            }, 500);
        }
        else {
            res.input("type something");
        }
        return [2 /*return*/];
    });
}); });
app.on("/testMiddleware", index_1["default"].requireInput("enter something"), function (req, res) {
    res.data("thanks. you typed " + req.query);
});
app.on("/other", function (_req, res) {
    res.data("welcome to the other page");
});
// app.on("/test", gemini.static("./src/things"));
app.on("/redirectMe", index_1["default"].redirect("/other"));
app.on("/cert", function (req, res) {
    if (!req.fingerprint) {
        res.certify();
    }
    else {
        res.data("thanks for the cert");
    }
});
app.on("/protected", index_1["default"].requireCert, function (_req, res) {
    res.data("only clients with certificates can get here");
});
app.titan("/titan", function (req, res) {
    var _a;
    res.data("Titan Data: \n" + ((_a = req.data) === null || _a === void 0 ? void 0 : _a.toString("utf-8")));
});
app.titan("/titan", index_1["default"].requireCert, function (req, res) {
    res.data("You can use gemini middleware in a titan request");
});
app.on("/titan", function (_req, res) {
    res.data("not a titan request!");
});
app.use("/titan", function (req, _res, next) {
    console.log(req.constructor.name);
    console.log("Is TitanRequest? ".concat(req instanceof index_1.TitanRequest));
    next();
});
// app.on("*", (req, res) => {
//   res.data("nyaa");
// });
app.listen(function () {
    console.log("Listening...");
});
