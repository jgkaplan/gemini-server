# Gemini Server

This is a server framework in Node.js for the
[Gemini Protocol](https://gemini.circumlunar.space/) based on Express.

Typescript type definitions are included.

TLS is a required part of the Gemini protocol. You can generate
keys/certificates using
`openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=localhost'`

## Install

`npm install --save gemini-server`

## Usage

### Create a gemini server

```javascript
const gemini = require("gemini-server");

const app = gemini(options);
```

where options is an object with the following properties:

cert: certificate file key: key file

### Handle a request to a route

This uses the express conventions, with the modification that the only method is
`on`.

```javascript
app.on(path, handler);
```

or

```javascript
app.on(path, ...middleware, handler);
```

Where `handler` is a function which takes in a `Request` and a `Response`, and
returns nothing. And `middleware` is 0 or more functions which take
`(req, res, next)` and return nothing. A middleware function should call
`next()` to continue onto the next function for handling. It should not call
`next` and should instead set the `res` object if it should return. NOTE:
middleware looks similar to express middleware, but isn't compatible.

Examples of path: `/` for the root of the site `/foo` `/foo/bar` `/user/:name`
`*`

Examples of handler: `function(req, res){ // do stuff }` general form
`gemini.static(dir)` serve a directory `gemini.redirect(url)` redirect to a url

Examples of middleware: `gemini.requireInput(prompt="Input requested")` Proceed
to handler only if user input is given, otherwise request input.

`gemini.requireCert` Proceed to handler only if user certificate is provided,
otherwise request a certificate.

### Listen for connections
```javascript
app.listen();
```
or
```javascript
app.listen(port);
```
or
```javascript
app.listen(callback);
```


### Static

`gemini.serveStatic(path, ?options)` serves the files in a directory
| Options | Description | default |
|---------|-------------|---------|
|index|Serves files named `index` with extensions specified in `indexExtensions` when accessing a directory without specifying any file|`true`
|indexExtensions|Defines the extensions to be served by the option `index`|`['.gemini', '.gmi']`
|redirectOnDirectory|Redirects an user to URL with `/` appended if the supplied path is the name of a directory|`true`

If another handler/middleware is chained behind the static middleware it will get called in case of a file/directory being unaccessable, making it possible to supply a custom "Not Found"-pages.

```javascript
app.on("/someFiles", gemini.serveStatic("src/files"));
```

### Redirect

`gemini.redirect(url)` will redirect to the specified url

```javascript
app.on("/redirectMe", gemini.redirect("/goingHereInstead"));

app.on("/redirectOther", gemini.redirect("http://example.com"));
```

### Request object

The request object is passed to request handlers.
`req.url` The URL object of the request
`req.path` The path component of the url
`req.query` The query component of the url (used for handling input)
`req.params` The params of a matched route
`req.cert` The certificate object, if the client sent one 
`req.fingerprint` The fingerprint of the certificate object, if the client sent one

### Response object

The response object is passed to request handlers. Methods on it can be chained,
as each both returns and modifies the request object. `res.status(s)` Set the
status of the response (see the gemini docs). s is an int `res.getStatus()`
return the current status associated with the response

`res.file(filename)` serve the specified file

`res.error(status, message)` or `res.error(message)` Alert the client of an error in processing

`res.data(d)` or `res.data(d, mimeType='text/plain')` Serve raw data as text, or
as whatever format you want if you specify the mime type.

`res.input(prompt, sensitive=false)` Prompt the client for input. Prompt should
be a string. `sensitive` defaults to false, and should be true if the input is
sensitive.

`res.certify(info="Please include a certificate.")` Request a certificate from
the client. Useful for sessions or login. Optional info message.

`res.redirect(url)` Redirect the client to the specified url.

### Middleware

A middleware registered through `app.use` will be executed before every route
handler. If a path is given as the first argument, only that path will be
affected.

```javascript
app.use((req, res, next) => {
  console.log(`Route ${req.path} was called`);
});
app.use("/foo", (req, res, next) => {
  console.log(`Foo route was called`);
});
```

## Titan
We include support for the [titan protocol](https://communitywiki.org/wiki/Titan), a sister protocol to gemini. This can be enabled by creating the gemini server with
```javascript
const options = {
  cert: readFileSync("cert.pem"),
  key: readFileSync("key.pem"),
  titanEnabled: true
};

const app = gemini(options);
```

or simply by defining a titan route.

`app.titan` can be used similarly to `app.on`, to include handlers for titan routes.
In such a handler, the request object will also have the following properties:
`data: Buffer | null`
`uploadSize: number`
`token: string | null`
`mimeType: string | null`

`app.use` will also work for titan routes.

## Example Server (Typescript)

```typescript
import { readFileSync } from "fs";
import gemini, { Request, Response, TitanRequest, NextFunction } from "../lib/index";

const options = {
  cert: readFileSync("cert.pem"),
  key: readFileSync("key.pem"),
  titanEnabled: true
};

const app = gemini(options);

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log("Handling path", req.path);
  next();
});

app.on("/", (_req: Request, res: Response) => {
  res.file("examplePages/test.gemini");
});

app.on("/input", (req: Request, res: Response) => {
  if (req.query) {
    res.data("you typed " + req.query);
  } else {
    res.input("type something");
  }
});

app.on("/paramTest/:foo", (req: Request, res: Response) => {
  res.data("you went to " + req.params.foo);
});

app.on("/async", async (req: Request, res: Response) => {
  if (req.query) {
      return new Promise(r => {
        setTimeout(r, 500);
      }).then(() => {
        res.data("you typed " + req.query);
      });
  } else {
    res.input("type something");
  }
});

app.on(
  "/testMiddleware",
  gemini.requireInput("enter something"),
  (req: Request, res: Response) => {
    res.data("thanks. you typed " + req.query);
  },
);

app.on("/other", (_req: Request, res: Response) => {
  res.data("welcome to the other page");
});

app.use("/static", gemini.serveStatic("./examplePages"));

app.on("/redirectMe", gemini.redirect("/other"));

app.on("/cert", (req: Request, res: Response) => {
  if (!req.fingerprint) {
    res.certify();
  } else {
    res.data("thanks for the cert");
  }
});

app.on("/protected", gemini.requireCert, (_req: Request, res: Response) => {
  res.data("only clients with certificates can get here");
});

app.titan("/titan", (req: TitanRequest, res: Response) => {
  console.log(req);
  res.data("Titan Data: \n" + req.data?.toString("utf-8"));
});

app.titan("/titanCert", gemini.requireCert, (req: TitanRequest, res: Response) => {
  res.data("You can use gemini middleware in a titan request");
});

app.on("/titan", (_req: Request, res: Response) => {
  res.data("not a titan request!");
});

app.use("/titan", (req: Request | TitanRequest, _res: Response, next: () => void) => {
  console.log(req.constructor.name);
  console.log(`Is TitanRequest? ${req instanceof TitanRequest}`)
  next();
});

app.listen(() => {
  console.log("Listening...");
});
```

## Todo

- [x] Documentation
- [x] Utility functions
  - [x] Static directory serving
    - [x] automatic index file
- [x] Certificates
- [x] Middleware support
- [ ] Session helper functions
- [ ] Router
- [ ] View engines
