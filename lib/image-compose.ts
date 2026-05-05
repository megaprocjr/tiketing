import sharp from "sharp";
import { generateBarcodeBuffer } from "./barcode";
import { readStoredFile } from "./files";
import type { BarcodeType } from "./validations";

export type PlacementLike = {
  barcodeType: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  rotation?: number;
  foreground: string;
  background: string;
  showText: boolean;
  showStudentName?: boolean;
  studentNameBackground?: string;
  studentNameOffsetPercent?: number;
  studentNameFontPercent?: number;
};

type ComposeTicketInput = {
  templatePath: string;
  outputPath?: string;
  ticketCode: string;
  studentName?: string;
  placement: PlacementLike;
  barcodeType?: BarcodeType;
};

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rotatedPointInExpandedCanvas(width: number, height: number, pointX: number, pointY: number, rotation: number) {
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const centerX = width / 2;
  const centerY = height / 2;
  const corners = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ].map(([x, y]) => {
    const dx = x - centerX;
    const dy = y - centerY;
    return {
      x: centerX + cos * dx - sin * dy,
      y: centerY + sin * dx + cos * dy,
    };
  });
  const minX = Math.min(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const pointDx = pointX - centerX;
  const pointDy = pointY - centerY;
  return {
    x: centerX + cos * pointDx - sin * pointDy - minX,
    y: centerY + sin * pointDx + cos * pointDy - minY,
  };
}

export async function composeTicketImage(input: ComposeTicketInput) {
  const templateBuffer = await readStoredFile(input.templatePath);
  const metadata = await sharp(templateBuffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Template tidak memiliki metadata dimensi yang valid.");
  }

  const type = (input.barcodeType ?? input.placement.barcodeType) as BarcodeType;
  const rawWidth = Math.round((metadata.width * input.placement.widthPercent) / 100);
  const rawHeight = Math.round((metadata.height * input.placement.heightPercent) / 100);
  const qrSize = Math.min(rawWidth, rawHeight);
  const barcodeWidth = type === "qrcode" ? qrSize : rawWidth;
  const barcodeHeight = type === "qrcode" ? qrSize : rawHeight;
  const left = Math.round((metadata.width * input.placement.xPercent) / 100);
  const top = Math.round((metadata.height * input.placement.yPercent) / 100);
  const centerX = left + barcodeWidth / 2;
  const centerY = top + barcodeHeight / 2;

  const barcode = await generateBarcodeBuffer({
    text: input.ticketCode,
    type,
    width: barcodeWidth,
    height: barcodeHeight,
    foreground: input.placement.foreground,
    background: input.placement.background === "transparent" ? "transparent" : "white",
    showText: input.placement.showText,
  });

  const rotation = input.placement.rotation ?? 0;
  const composites: sharp.OverlayOptions[] = [];
  if (input.studentName?.trim() && input.placement.showStudentName !== false) {
    const text = escapeSvgText(input.studentName.trim());
    const textBoxWidth = Math.round(Math.max(barcodeWidth, rawWidth, metadata.width * 0.16));
    const configuredFont = metadata.width * ((input.placement.studentNameFontPercent ?? 3) / 100);
    const fontSize = Math.round(clamp(configuredFont, 12, metadata.width * 0.08));
    const textBoxHeight = Math.round(fontSize * 1.9);
    const offsetPx = Math.round(metadata.height * ((input.placement.studentNameOffsetPercent ?? 1.5) / 100));
    const groupWidth = Math.max(barcodeWidth, textBoxWidth);
    const groupHeight = barcodeHeight + Math.max(0, offsetPx) + textBoxHeight;
    const barcodeLeft = Math.round((groupWidth - barcodeWidth) / 2);
    const labelLeft = Math.round((groupWidth - textBoxWidth) / 2);
    const labelTop = barcodeHeight + Math.max(0, offsetPx);
    const backgroundRect =
      input.placement.studentNameBackground === "transparent"
        ? ""
        : `<rect x="0" y="0" width="${textBoxWidth}" height="${textBoxHeight}" rx="${Math.round(fontSize * 0.25)}" fill="white" fill-opacity="0.92"/>`;
    const labelSvg = Buffer.from(`
      <svg width="${textBoxWidth}" height="${textBoxHeight}" xmlns="http://www.w3.org/2000/svg">
        ${backgroundRect}
        <text x="${textBoxWidth / 2}" y="${Math.round(textBoxHeight / 2 + fontSize * 0.35)}"
          font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700"
          fill="#111827" text-anchor="middle" textLength="${Math.round(textBoxWidth * 0.88)}" lengthAdjust="spacingAndGlyphs">${text}</text>
      </svg>
    `);
    const group = await sharp({
      create: {
        width: groupWidth,
        height: groupHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    })
      .composite([
        { input: barcode, left: barcodeLeft, top: 0 },
        { input: labelSvg, left: labelLeft, top: labelTop },
      ])
      .png()
      .toBuffer();
    const overlay =
      Math.abs(rotation) > 0.01
        ? await sharp(group)
            .rotate(rotation, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toBuffer()
        : group;
    const barcodeCenterInOverlay =
      Math.abs(rotation) > 0.01
        ? rotatedPointInExpandedCanvas(groupWidth, groupHeight, barcodeLeft + barcodeWidth / 2, barcodeHeight / 2, rotation)
        : { x: barcodeLeft + barcodeWidth / 2, y: barcodeHeight / 2 };
    composites.push({
      input: overlay,
      left: Math.round(centerX - barcodeCenterInOverlay.x),
      top: Math.round(centerY - barcodeCenterInOverlay.y),
    });
  } else {
    const rotatedBarcode =
      Math.abs(rotation) > 0.01
        ? await sharp(barcode)
            .rotate(rotation, {
              background: input.placement.background === "transparent" ? { r: 255, g: 255, b: 255, alpha: 0 } : "white",
            })
            .png()
            .toBuffer()
        : barcode;
    const rotatedMetadata = await sharp(rotatedBarcode).metadata();
    const rotatedWidth = rotatedMetadata.width ?? barcodeWidth;
    const rotatedHeight = rotatedMetadata.height ?? barcodeHeight;
    composites.push({ input: rotatedBarcode, left: Math.round(centerX - rotatedWidth / 2), top: Math.round(centerY - rotatedHeight / 2) });
  }

  const outputBuffer = await sharp(templateBuffer)
    .composite(composites)
    .png()
    .toBuffer();

  if (input.outputPath) {
    await sharp(outputBuffer).toFile(input.outputPath);
  }

  return outputBuffer;
}
