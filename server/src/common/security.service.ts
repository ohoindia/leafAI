import { Injectable } from "@nestjs/common";
import { encrypt, issueTokens, sha256 } from "../security.js";
@Injectable()
export class SecurityService {
  encrypt = encrypt;
  issueTokens = issueTokens;
  sha256 = sha256;
}
