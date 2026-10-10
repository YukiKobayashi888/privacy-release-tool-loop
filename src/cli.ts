import { diagnoseRelease } from "./release_diagnostics.js";

const input = {
  service: "patient-portal",
  version: "v2.4.1",
  changedFiles: ["src/release_diagnostics.ts"],
  containsPatientData: false
};

const result = await diagnoseRelease(input);
console.log(JSON.stringify(result, null, 2));
