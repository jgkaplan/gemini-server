export type status =
  | 10 //input
  | 11 //sensitive input
  | 20 //success
  | 30 //redirect - temporary
  | 31 //redirect - permanent
  | 40 //temporary failure
  | 41 //server unavailable
  | 42 //CGI error
  | 43 //proxy error
  | 44 //slow down
  | 50 //permanent failure
  | 51 //not found
  | 52 //gone
  | 53 //proxy request refused
  | 59 //bad request
  | 60 //client certificate required
  | 61 //client certificate not authorized
  | 62; //client certificate not valid
