// Utility functions for Canvas 2D Poster Rendering

export async function preloadImage(src: string): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined" || !src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Draw a rounded rectangle path
 */
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | [number, number, number, number]
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    const r = typeof radius === "number" ? radius : radius[0];
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Word wrap text with line limits and optional ellipsis
 */
export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 4
): number {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && n > 0) {
      lineCount++;
      if (lineCount >= maxLines) {
        // Truncate line with ellipsis
        const truncated = line.trim() + "...";
        ctx.fillText(truncated, x, currentY);
        return currentY;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line.trim().length > 0 && lineCount < maxLines) {
    ctx.fillText(line.trim(), x, currentY);
  }

  return currentY;
}

/**
 * Draw a clean vector national flag badge
 */
export function drawCountryFlag(
  ctx: CanvasRenderingContext2D,
  iso: string,
  x: number,
  y: number,
  w: number = 32,
  h: number = 22
) {
  ctx.save();
  // Clip to rounded rect
  drawRoundRect(ctx, x, y, w, h, 4);
  ctx.clip();

  const upper = (iso || "").toUpperCase();

  if (upper === "NLD") {
    // Netherlands: Red, White, Blue horizontal
    const stripeH = h / 3;
    ctx.fillStyle = "#C8102E";
    ctx.fillRect(x, y, w, stripeH);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y + stripeH, w, stripeH);
    ctx.fillStyle = "#003DA5";
    ctx.fillRect(x, y + stripeH * 2, w, stripeH);
  } else if (upper === "DEU") {
    // Germany: Black, Red, Gold
    const stripeH = h / 3;
    ctx.fillStyle = "#000000";
    ctx.fillRect(x, y, w, stripeH);
    ctx.fillStyle = "#DD0000";
    ctx.fillRect(x, y + stripeH, w, stripeH);
    ctx.fillStyle = "#FFCC00";
    ctx.fillRect(x, y + stripeH * 2, w, stripeH);
  } else if (upper === "FRA") {
    // France: Blue, White, Red vertical
    const stripeW = w / 3;
    ctx.fillStyle = "#002395";
    ctx.fillRect(x, y, stripeW, h);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + stripeW, y, stripeW, h);
    ctx.fillStyle = "#ED2939";
    ctx.fillRect(x + stripeW * 2, y, stripeW, h);
  } else if (upper === "ITA") {
    // Italy: Green, White, Red vertical
    const stripeW = w / 3;
    ctx.fillStyle = "#009246";
    ctx.fillRect(x, y, stripeW, h);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + stripeW, y, stripeW, h);
    ctx.fillStyle = "#CE2B37";
    ctx.fillRect(x + stripeW * 2, y, stripeW, h);
  } else if (upper === "JPN") {
    // Japan: White with red sun
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#BC002D";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, h * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (upper === "BGD") {
    // Bangladesh: Green with red sun
    ctx.fillStyle = "#006A4E";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#F42A41";
    ctx.beginPath();
    ctx.arc(x + w * 0.45, y + h / 2, h * 0.32, 0, Math.PI * 2);
    ctx.fill();
  } else if (upper === "GBR") {
    // UK: Dark navy base with crosses
    ctx.fillStyle = "#012169";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
    ctx.strokeStyle = "#C8102E";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
    // St George cross
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + w / 2 - 3, y, 6, h);
    ctx.fillRect(x, y + h / 2 - 3, w, 6);
    ctx.fillStyle = "#C8102E";
    ctx.fillRect(x + w / 2 - 1.5, y, 3, h);
    ctx.fillRect(x, y + h / 2 - 1.5, w, 3);
  } else {
    // Elegant fallback: Navy base with gold ISO letters
    ctx.fillStyle = "#1E2C3A";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#F5B041";
    ctx.font = "bold 10px Montserrat, Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(upper.slice(0, 3), x + w / 2, y + h / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  ctx.restore();

  // Subtle border
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 1;
  drawRoundRect(ctx, x, y, w, h, 4);
  ctx.stroke();
}

/**
 * Draw a clean teardrop map pin
 */
export function drawMapPin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string = "#E11D48",
  radius: number = 7
) {
  ctx.save();
  // Pin Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, radius * 0.9, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pin Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - radius * 1.5, radius, Math.PI * 0.15, Math.PI * 0.85, true);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();

  // Pin Center Dot (White)
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(x, y - radius * 1.5, radius * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a clean vector flight airplane icon oriented along tangent
 */
export function drawAirplane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleRad: number,
  size: number = 18,
  color: string = "#1E2C3A"
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);

  ctx.fillStyle = color;
  ctx.beginPath();
  // Fuselage and wings
  ctx.moveTo(size * 0.5, 0); // nose
  ctx.lineTo(size * 0.1, -size * 0.12);
  ctx.lineTo(-size * 0.1, -size * 0.55); // top wing tip
  ctx.lineTo(-size * 0.22, -size * 0.55);
  ctx.lineTo(-size * 0.12, -size * 0.12);
  ctx.lineTo(-size * 0.4, -size * 0.12);
  ctx.lineTo(-size * 0.5, -size * 0.32); // top tail tip
  ctx.lineTo(-size * 0.55, -size * 0.32);
  ctx.lineTo(-size * 0.5, 0); // tail center
  ctx.lineTo(-size * 0.55, size * 0.32);
  ctx.lineTo(-size * 0.5, size * 0.32); // bottom tail tip
  ctx.lineTo(-size * 0.4, size * 0.12);
  ctx.lineTo(-size * 0.12, size * 0.12);
  ctx.lineTo(-size * 0.22, size * 0.55); // bottom wing tip
  ctx.lineTo(-size * 0.1, size * 0.55);
  ctx.lineTo(size * 0.1, size * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
