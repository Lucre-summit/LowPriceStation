// Metro bundles CSS imports on web (the map's stylesheet is one); TypeScript needs to be told
// that such an import exists and has no exported values.
declare module "*.css";
