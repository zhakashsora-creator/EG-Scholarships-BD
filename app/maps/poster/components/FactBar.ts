// Component: Essential Facts Bar (Program Level, Deadline, Award Status)
// Strictly ZERO clip-art icons: Professional text hierarchy & clean dividers only
import type { ScholarshipPosterModel } from "../posterModel";
import { drawRoundRect } from "../posterUtils";

export function renderFactBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  model: ScholarshipPosterModel,
  yPos: number = 585
) {
  const barX = 52;
  const barY = yPos;
  const barW = width - 104; // 1096
  const barH = 82;

  // 1. White Card Background
  ctx.fillStyle = "#FFFFFF";
  drawRoundRect(ctx, barX, barY, barW, barH, 14);
  ctx.fill();

  ctx.strokeStyle = "rgba(245, 176, 65, 0.65)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 2. Three Equal Column Divisions
  const colW = barW / 3;

  // Vertical Divider 1
  ctx.strokeStyle = "rgba(203, 213, 225, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(barX + colW, barY + 12);
  ctx.lineTo(barX + colW, barY + barH - 12);
  ctx.stroke();

  // Vertical Divider 2
  ctx.beginPath();
  ctx.moveTo(barX + colW * 2, barY + 12);
  ctx.lineTo(barX + colW * 2, barY + barH - 12);
  ctx.stroke();

  // 3. Col 1: Program Level
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 15px Inter, sans-serif";
  ctx.fillText("PROGRAM LEVEL", barX + 28, barY + 30);

  ctx.fillStyle = "#1E293B";
  ctx.font = "800 24px Montserrat, Inter, sans-serif";
  const safeLevel = model.programLevel.length > 22 ? model.programLevel.slice(0, 20) + "..." : model.programLevel;
  ctx.fillText(safeLevel, barX + 28, barY + 62);

  // 4. Col 2: Deadline
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 15px Inter, sans-serif";
  ctx.fillText("DEADLINE", barX + colW + 28, barY + 30);

  ctx.fillStyle = "#1E293B";
  ctx.font = "800 24px Montserrat, Inter, sans-serif";
  const safeDeadline = model.deadline.length > 20 ? model.deadline.slice(0, 18) + "..." : model.deadline;
  ctx.fillText(safeDeadline, barX + colW + 28, barY + 62);

  // 5. Col 3: Award Status
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 15px Inter, sans-serif";
  ctx.fillText("AWARD STATUS", barX + colW * 2 + 28, barY + 30);

  ctx.fillStyle = "#1E293B";
  ctx.font = "800 24px Montserrat, Inter, sans-serif";
  const safeStatus = model.awardStatus.length > 22 ? model.awardStatus.slice(0, 20) + "..." : model.awardStatus;
  ctx.fillText(safeStatus, barX + colW * 2 + 28, barY + 62);
}
