// Component: QR Code Card + Bangladesh-to-Destination Route Map
// Completely data-driven route framing, vector landmasses, flight arc & directional airplane
import type { ScholarshipPosterModel } from "../posterModel";
import type { WorldData } from "@/components/compass/MapEngine";
import { drawRoundRect, drawMapPin, drawAirplane, drawCountryFlag } from "../posterUtils";

export function renderScholarshipRouteMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  model: ScholarshipPosterModel,
  qrImg: HTMLImageElement | null,
  worldData?: WorldData | null,
  yPos: number = 978
) {
  const startX = 52;
  const startY = yPos;
  const cardH = 345;

  // 1. Left Column: QR Card (320px width)
  const qrCardW = 320;
  ctx.fillStyle = "#FFFFFF";
  drawRoundRect(ctx, startX, startY, qrCardW, cardH, 18);
  ctx.fill();

  ctx.strokeStyle = "rgba(245, 176, 65, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // QR Top Banner
  const bannerW = 286;
  const bannerH = 38;
  const bannerX = startX + (qrCardW - bannerW) / 2;
  const bannerY = startY + 14;

  ctx.fillStyle = "#F5B041";
  drawRoundRect(ctx, bannerX, bannerY, bannerW, bannerH, 8);
  ctx.fill();

  ctx.fillStyle = "#1E2C3A";
  ctx.font = "bold 15px Montserrat, Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SCAN FOR SCHOLARSHIP MAP", bannerX + bannerW / 2, bannerY + 24);

  // Scannable QR Code Image
  const qrSize = 210;
  const qrX = startX + (qrCardW - qrSize) / 2;
  const qrY = bannerY + bannerH + 14;

  if (qrImg && qrImg.width > 0) {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } else {
    // QR Placeholder if image decoding fails
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(qrX, qrY, qrSize, qrSize);
    ctx.strokeStyle = "#CBD5E1";
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.fillText("QR: scholarships.egconsultancy.com.bd/maps", qrX + qrSize / 2, qrY + qrSize / 2);
  }

  // QR Bottom Pill: "Portal / Maps"
  const pillW = 150;
  const pillH = 34;
  const pillX = startX + (qrCardW - pillW) / 2;
  const pillY = qrY + qrSize + 12;

  ctx.fillStyle = "#1E2C3A";
  drawRoundRect(ctx, pillX, pillY, pillW, pillH, 17);
  ctx.fill();

  ctx.fillStyle = "#F5B041";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.fillText("Portal / Maps", pillX + pillW / 2, pillY + 22);
  ctx.textAlign = "left"; // reset

  // 2. Right Column: Geographic Route Map
  const mapX = startX + qrCardW + 18; // 390
  const mapW = width - mapX - 52; // 758
  const mapH = cardH;

  ctx.save();
  // Clip map to rounded container
  drawRoundRect(ctx, mapX, startY, mapW, mapH, 18);
  ctx.clip();

  // Ocean / Water Background
  ctx.fillStyle = "#E8F4F8";
  ctx.fillRect(mapX, startY, mapW, mapH);

  // Coordinate framing for Bangladesh and Destination
  const bgdC = model.originCentroid; // [741.4, 155.3] in 1000x444.7 world coordinates
  const destC = model.destinationCentroid || [510.5, 61.5]; // Default Netherlands if unmapped

  // Determine viewport bounds in world.json coordinates (1000 x 444.7)
  const minC_X = Math.min(bgdC[0], destC[0]);
  const maxC_X = Math.max(bgdC[0], destC[0]);
  const minC_Y = Math.min(bgdC[1], destC[1]);
  const maxC_Y = Math.max(bgdC[1], destC[1]);

  const padX = Math.max((maxC_X - minC_X) * 0.35, 120);
  const padY = Math.max((maxC_Y - minC_Y) * 0.45, 80);

  const viewX1 = Math.max(0, minC_X - padX);
  const viewX2 = Math.min(1000, maxC_X + padX);
  const viewY1 = Math.max(0, minC_Y - padY);
  const viewY2 = Math.min(444.7, maxC_Y + padY);

  const viewW = viewX2 - viewX1;
  const viewH = viewY2 - viewY1;

  // Scale factors to fit [viewW, viewH] into [mapW, mapH]
  const scale = Math.min(mapW / viewW, mapH / viewH) * 0.92;
  const offsetX = mapX + (mapW - viewW * scale) / 2;
  const offsetY = startY + (mapH - viewH * scale) / 2;

  // Projection helper: world [cx, cy] -> screen [px, py]
  const project = (coord: [number, number]): [number, number] => {
    return [
      offsetX + (coord[0] - viewX1) * scale,
      offsetY + (coord[1] - viewY1) * scale,
    ];
  };

  // 3. Draw Vector Country Polygons from worldData
  if (worldData && Array.isArray(worldData.f)) {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.translate(-viewX1, -viewY1);

    for (const f of worldData.f) {
      if (!f.d) continue;

      const path = new Path2D(f.d);
      const isBgd = f.i === "BGD";
      const isDest = f.i === model.destinationIso;

      if (isBgd) {
        ctx.fillStyle = "#10B981"; // Vibrant emerald green for Bangladesh
        ctx.fill(path);
        ctx.strokeStyle = "#059669";
        ctx.lineWidth = 1.8 / scale;
        ctx.stroke(path);
      } else if (isDest) {
        ctx.fillStyle = "#F5B041"; // Vibrant golden yellow for Destination
        ctx.fill(path);
        ctx.strokeStyle = "#D97706";
        ctx.lineWidth = 1.8 / scale;
        ctx.stroke(path);
      } else {
        ctx.fillStyle = "#D6E6F0"; // Soft pale blue-gray for other landmasses
        ctx.fill(path);
        ctx.strokeStyle = "#BED4E2";
        ctx.lineWidth = 0.8 / scale;
        ctx.stroke(path);
      }
    }

    ctx.restore();
  }

  // Projected screen positions
  const [bgdScreenX, bgdScreenY] = project(bgdC);
  const [destScreenX, destScreenY] = project(destC);

  // 4. Curved Flight Arc from Bangladesh to Destination
  const startArcX = bgdScreenX;
  const startArcY = bgdScreenY - 6;
  const endArcX = destScreenX;
  const endArcY = destScreenY - 6;

  // Flight curve control point arched upwards
  const midX = (startArcX + endArcX) / 2;
  const dist = Math.hypot(endArcX - startArcX, endArcY - startArcY);
  const arcHeight = Math.max(50, Math.min(130, dist * 0.28));
  const ctrlX = midX;
  const ctrlY = Math.min(startArcY, endArcY) - arcHeight;

  // Draw dashed flight path
  ctx.save();
  ctx.strokeStyle = "#1E2C3A";
  ctx.lineWidth = 2.8;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(startArcX, startArcY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, endArcX, endArcY);
  ctx.stroke();
  ctx.restore();

  // Draw Airplane at midpoint (t = 0.5)
  const t = 0.5;
  const planeX = (1 - t) * (1 - t) * startArcX + 2 * (1 - t) * t * ctrlX + t * t * endArcX;
  const planeY = (1 - t) * (1 - t) * startArcY + 2 * (1 - t) * t * ctrlY + t * t * endArcY;
  // Tangent vector
  const dx = 2 * (1 - t) * (ctrlX - startArcX) + 2 * t * (endArcX - ctrlX);
  const dy = 2 * (1 - t) * (ctrlY - startArcY) + 2 * t * (endArcY - ctrlY);
  const angle = Math.atan2(dy, dx);
  drawAirplane(ctx, planeX, planeY, angle, 20, "#1E2C3A");

  // 5. Origin Marker (Bangladesh)
  drawMapPin(ctx, bgdScreenX, bgdScreenY, "#E11D48", 7);
  // Bangladesh Pill Badge
  const bgdPillW = 120;
  const bgdPillH = 28;
  const bgdPillX = Math.min(mapX + mapW - bgdPillW - 8, Math.max(mapX + 8, bgdScreenX - bgdPillW / 2 + 30));
  const bgdPillY = Math.min(startY + mapH - bgdPillH - 8, Math.max(startY + 8, bgdScreenY - 32));

  ctx.fillStyle = "#1E2C3A";
  drawRoundRect(ctx, bgdPillX, bgdPillY, bgdPillW, bgdPillH, 14);
  ctx.fill();
  drawCountryFlag(ctx, "BGD", bgdPillX + 6, bgdPillY + 5, 24, 18);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.fillText("Bangladesh", bgdPillX + 36, bgdPillY + 18);

  // 6. Destination Marker
  drawMapPin(ctx, destScreenX, destScreenY, "#E11D48", 7);
  // Destination Pill Badge
  const destNameLabel = model.destinationName.length > 14 ? model.destinationName.slice(0, 12) + "..." : model.destinationName;
  ctx.font = "bold 13px Inter, sans-serif";
  const labelTextW = ctx.measureText(destNameLabel).width;
  const destPillW = Math.max(110, labelTextW + 42);
  const destPillH = 28;
  const destPillX = Math.min(mapX + mapW - destPillW - 8, Math.max(mapX + 8, destScreenX - destPillW / 2 - 20));
  const destPillY = Math.min(startY + mapH - destPillH - 8, Math.max(startY + 8, destScreenY - 32));

  ctx.fillStyle = "#1E2C3A";
  drawRoundRect(ctx, destPillX, destPillY, destPillW, destPillH, 14);
  ctx.fill();
  drawCountryFlag(ctx, model.destinationIso, destPillX + 6, destPillY + 5, 24, 18);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(destNameLabel, destPillX + 36, destPillY + 18);

  ctx.restore(); // restore clipping

  // Map Outer Golden Border
  ctx.strokeStyle = "rgba(245, 176, 65, 0.55)";
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, mapX, startY, mapW, mapH, 18);
  ctx.stroke();
}
