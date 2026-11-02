// Component: Poster Header with Double Border, Logo, Title & Verification Badge
import type { ScholarshipPosterModel } from "../posterModel";
import { drawRoundRect } from "../posterUtils";

export function renderPosterHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  model: ScholarshipPosterModel,
  logoImg: HTMLImageElement | null
) {
  // 1. Overall Canvas Background (Warm light luxury cream)
  ctx.fillStyle = "#FAF7F2";
  ctx.fillRect(0, 0, width, height);

  // 2. Double Outer Frame (Navy outer, gold inner, small cream gap)
  ctx.strokeStyle = "#2C3E50";
  ctx.lineWidth = 2.5;
  drawRoundRect(ctx, 24, 24, width - 48, height - 48, 16);
  ctx.stroke();

  ctx.strokeStyle = "#F5B041";
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, 34, 34, width - 68, height - 68, 12);
  ctx.stroke();

  // 3. EGC Logo (Left)
  if (logoImg && logoImg.width > 0) {
    const logoW = 260;
    const logoH = (logoImg.height / logoImg.width) * logoW;
    ctx.drawImage(logoImg, 52, 54, logoW, Math.min(logoH, 95));
  } else {
    // Elegant vector logo fallback
    ctx.fillStyle = "#2C3E50";
    drawRoundRect(ctx, 52, 58, 48, 48, 8);
    ctx.fill();
    ctx.fillStyle = "#F5B041";
    ctx.font = "bold 24px Montserrat, Inter, sans-serif";
    ctx.fillText("EG", 62, 92);

    ctx.fillStyle = "#2C3E50";
    ctx.font = "bold 22px Montserrat, Inter, sans-serif";
    ctx.fillText("Excellence Global", 110, 80);
    ctx.fillStyle = "#64748B";
    ctx.font = "14px Inter, sans-serif";
    ctx.fillText("Study Abroad | VISA Consultancy", 110, 102);
  }

  // 4. Vertical Gold Divider
  ctx.strokeStyle = "#F5B041";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(355, 56);
  ctx.lineTo(355, 148);
  ctx.stroke();

  // 5. Center Title & Motto
  ctx.fillStyle = "#2C3E50";
  ctx.font = "bold 26px Montserrat, Inter, sans-serif";
  ctx.fillText("EXCELLENCE GLOBAL", 380, 88);
  ctx.fillText("CONSULTANCY", 380, 118);

  ctx.fillStyle = "#2980B9";
  ctx.font = "italic 500 16px Inter, sans-serif";
  ctx.fillText("EG Scholarships Directory • Evidence, not promises.", 380, 144);

  // 6. Right: Verification Badge
  const badgeW = 285;
  const badgeH = 46;
  const badgeX = width - 54 - badgeW;
  const badgeY = 66;

  ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
  drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 23);
  ctx.fill();
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Checkmark circle
  ctx.fillStyle = "#10B981";
  ctx.beginPath();
  ctx.arc(badgeX + 24, badgeY + 23, 12, 0, Math.PI * 2);
  ctx.fill();

  // White checkmark icon
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(badgeX + 19, badgeY + 23);
  ctx.lineTo(badgeX + 23, badgeY + 27);
  ctx.lineTo(badgeX + 30, badgeY + 19);
  ctx.stroke();

  // Badge Text
  ctx.fillStyle = "#047857";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.fillText("EG RESEARCH DESK", badgeX + 46, badgeY + 22);
  ctx.fillText("VERIFIED", badgeX + 46, badgeY + 38);
}
