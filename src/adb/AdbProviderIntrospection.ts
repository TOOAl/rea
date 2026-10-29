import { AnalysisProtocolError } from "../domain/analysisErrorCore.js";

export const handle = async (..._args: any[]): Promise<any> => {
  throw new AnalysisProtocolError(
    "introspection moved - use main delegation stub",
  );
};
