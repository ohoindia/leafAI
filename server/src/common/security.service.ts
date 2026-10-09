import { Injectable } from "@nestjs/common";
import { encrypt, decrypt, issueTokens, sha256 } from "../security.js";
@Injectable()
export class SecurityService {
  encrypt = encrypt;
  decrypt = decrypt;
  issueTokens = issueTokens;
  sha256 = sha256;
}
