declare module "bwip-js" {
  type BwipOptions = Record<string, string | number | boolean | undefined>;
  const bwipjs: {
    toBuffer(options: BwipOptions): Promise<Buffer>;
  };
  export default bwipjs;
}
