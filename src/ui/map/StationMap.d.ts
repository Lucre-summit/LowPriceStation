// Metro bundles StationMap.web.tsx for the web build and StationMap.native.tsx for Android and
// iOS; this declaration is what lets TypeScript resolve the extensionless import. The props are
// shared (see types.ts), so typing against either implementation is the same contract.
export { StationMap } from "./StationMap.web";
