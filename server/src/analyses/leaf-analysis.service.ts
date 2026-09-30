import { Injectable } from "@nestjs/common";
import { analyzeLeaf } from "../analysis.js";
@Injectable()
export class LeafAnalysisService {
  analyzeLeaf = analyzeLeaf;
}
