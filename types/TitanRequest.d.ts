import Request from "./Request";

export = TitanRequest
declare class TitanRequest extends Request {
  data: Buffer
  uploadSize: number
  token: string
  mimeType: string
}