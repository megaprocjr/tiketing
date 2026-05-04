import bwipjs from "bwip-js";
import sharp from "sharp";
import type { BarcodeType } from "./validations";

type GenerateBarcodeInput = {
  text: string;
  type: BarcodeType;
  width: number;
  height: number;
  foreground?: string;
  background?: "white" | "transparent";
  showText?: boolean;
};

const bcidMap: Record<BarcodeType, string> = {
  qrcode: "qrcode",
  code128: "code128",
  pdf417: "pdf417",
};

function normalizeColor(color: string | undefined) {
  if (!color || color === "black") return "000000";
  return color.replace("#", "").toUpperCase();
}

async function whiteToTransparent(buffer: Buffer) {
  const image = sharp(buffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    if (data[index] > 245 && data[index + 1] > 245 && data[index + 2] > 245) {
      data[index + 3] = 0;
    }
  }
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

export async function generateBarcodeBuffer(input: GenerateBarcodeInput) {
  const boxSize = input.type === "qrcode" ? Math.min(input.width, input.height) : input.width;
  const targetWidth = Math.max(40, Math.round(boxSize));
  const targetHeight = Math.max(40, Math.round(input.type === "qrcode" ? boxSize : input.height));
  const padding = Math.max(8, Math.round(Math.min(targetWidth, targetHeight) * 0.06));

  const raw = await bwipjs.toBuffer({
    bcid: bcidMap[input.type],
    text: input.text,
    scale: input.type === "qrcode" ? 6 : 4,
    includetext: input.type === "code128" ? Boolean(input.showText) : false,
    textxalign: "center",
    barcolor: normalizeColor(input.foreground),
    backgroundcolor: "FFFFFF",
    paddingwidth: padding,
    paddingheight: padding,
  });

  const resized = await sharp(raw)
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: input.type === "qrcode" ? "contain" : "fill",
      background: input.background === "transparent" ? { r: 255, g: 255, b: 255, alpha: 0 } : "white",
    })
    .png()
    .toBuffer();

  return input.background === "transparent" ? whiteToTransparent(resized) : resized;
}
