// Component: Three Core Information Cards (Cost, Benefits, Eligibility)
// Zero Clip-Art: High contrast dark navy header band with gold typography & readable body copy
import type { ScholarshipPosterModel } from "../posterModel";
import { drawRoundRect, drawWrappedText } from "../posterUtils";

export function renderInfoCards(
  ctx: CanvasRenderingContext2D,
  width: number,
  model: ScholarshipPosterModel,
  yPos: number = 685
) {
  const startX = 52;
  const startY = yPos;
  const totalW = width - 104; // 1096
  const gap = 18;
  const cardW = (totalW - gap * 2) / 3; // ~353.3px
  const cardH = 275;
  const headerH = 54;

  const cardsData = [
    {
      title: "COST & TUITION",
      content: model.costTuitionSummary,
    },
    {
      title: "BENEFITS & LIVING ALLOWANCE",
      content: model.benefitsSummary,
    },
    {
      title: "ELIGIBILITY & STRATEGY",
      content: model.eligibilityStrategySummary,
    },
  ];

  cardsData.forEach((card, idx) => {
    const cardX = startX + idx * (cardW + gap);

    // 1. White Card Body
    ctx.fillStyle = "#FFFFFF";
    drawRoundRect(ctx, cardX, startY, cardW, cardH, 16);
    ctx.fill();

    // 2. Dark Navy Header Band
    ctx.save();
    drawRoundRect(ctx, cardX, startY, cardW, cardH, 16);
    ctx.clip();

    ctx.fillStyle = "#1E2C3A";
    ctx.fillRect(cardX, startY, cardW, headerH);

    // Bottom gold accent line under header band
    ctx.strokeStyle = "#F5B041";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX, startY + headerH);
    ctx.lineTo(cardX + cardW, startY + headerH);
    ctx.stroke();

    // Header Title (Clean Gold Text Only, ZERO Clip-Art)
    ctx.fillStyle = "#F5B041";
    ctx.font = "bold 19px Montserrat, Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(card.title, cardX + cardW / 2, startY + 34);
    ctx.textAlign = "left"; // reset

    ctx.restore();

    // Card Outer Golden Stroke
    ctx.strokeStyle = "rgba(245, 176, 65, 0.55)";
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, cardX, startY, cardW, cardH, 16);
    ctx.stroke();

    // 3. Card Body Text (Large, High Contrast, 23px font, 32px line-height)
    ctx.fillStyle = "#1E293B";
    ctx.font = "600 23px Inter, sans-serif";
    const textPadX = 20;
    const textPadY = startY + headerH + 34;
    drawWrappedText(ctx, card.content, cardX + textPadX, textPadY, cardW - textPadX * 2, 32, 6);
  });
}
