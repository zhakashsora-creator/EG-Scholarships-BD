// Component: Portal CTA Strip & Company Contact Footer
// Zero Clip-Art: High-contrast typography & clean official contact credentials
import type { ScholarshipPosterModel } from "../posterModel";
import { drawRoundRect } from "../posterUtils";

export function renderPosterFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  model: ScholarshipPosterModel,
  yPos: number = 1338
) {
  const barX = 52;
  const barY = yPos;
  const barW = width - 104; // 1096
  const barH = 54;

  // 1. Dark Navy CTA Strip
  ctx.fillStyle = "#1E2C3A";
  drawRoundRect(ctx, barX, barY, barW, barH, 10);
  ctx.fill();

  ctx.strokeStyle = "rgba(245, 176, 65, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // CTA Text (Zero Globe Clip-Art, Prominent URL)
  ctx.font = "600 20px Inter, sans-serif";
  const part1 = "Visit ";
  const urlPart = "https://scholarships.egconsultancy.com.bd/maps";
  const part2 = " for more scholarships around the globe";

  const w1 = ctx.measureText(part1).width;
  ctx.font = "bold 20px Inter, sans-serif";
  const wUrl = ctx.measureText(urlPart).width;
  ctx.font = "600 20px Inter, sans-serif";
  const w2 = ctx.measureText(part2).width;

  const totalTextW = w1 + wUrl + w2;
  const textStartX = barX + (barW - totalTextW) / 2;
  const textY = barY + 34;

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 20px Inter, sans-serif";
  ctx.fillText(part1, textStartX, textY);

  ctx.fillStyle = "#F5B041";
  ctx.font = "bold 20px Inter, sans-serif";
  ctx.fillText(urlPart, textStartX + w1, textY);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 20px Inter, sans-serif";
  ctx.fillText(part2, textStartX + w1 + wUrl, textY);

  // 2. Company Address & Contact Footer (Clean Text, Zero Clip-Art)
  const footerY = barY + barH + 34; // 1426
  ctx.fillStyle = "#475569";
  ctx.font = "600 16px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Excellence Global Consultancy • House 22, Road 1, Block Ta, Mirpur, Dhaka 1216 | WhatsApp: +880 1601-247111",
    width / 2,
    footerY
  );
  ctx.textAlign = "left"; // reset
}
