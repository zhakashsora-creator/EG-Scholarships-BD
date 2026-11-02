// Component: Destination + University Hero Section with Campus Image, Logo & Navy Card
import type { ScholarshipPosterModel } from "../posterModel";
import { drawRoundRect, drawCountryFlag, drawWrappedText } from "../posterUtils";

export function renderScholarshipHero(
  ctx: CanvasRenderingContext2D,
  width: number,
  model: ScholarshipPosterModel,
  heroImg: HTMLImageElement | null,
  logoImg: HTMLImageElement | null
) {
  // 1. Destination Header Line
  const startX = 52;
  const startY = 175;
  const cardW = 540;

  // National Flag Badge
  drawCountryFlag(ctx, model.destinationIso, startX, startY, 40, 27);

  // Destination Text (Dynamically scaled so it never wraps or overlaps)
  const destNameUpper = model.destinationName.toUpperCase();
  const fullDestText = model.destinationNameBn
    ? `DESTINATION: ${destNameUpper} (${model.destinationNameBn})`
    : `DESTINATION: ${destNameUpper}`;

  let fontSize = 23;
  ctx.font = `bold ${fontSize}px Montserrat, Inter, sans-serif`;
  while (ctx.measureText(fullDestText).width > cardW - 60 && fontSize > 16) {
    fontSize--;
    ctx.font = `bold ${fontSize}px Montserrat, Inter, sans-serif`;
  }

  ctx.fillStyle = "#2C3E50";
  ctx.fillText(`DESTINATION: ${destNameUpper}`, startX + 50, startY + 21);

  if (model.destinationNameBn) {
    const mainWidth = ctx.measureText(`DESTINATION: ${destNameUpper} `).width;
    ctx.fillStyle = "#4B5563";
    ctx.font = `600 ${fontSize - 2}px Inter, sans-serif`;
    ctx.fillText(`(${model.destinationNameBn})`, startX + 50 + mainWidth, startY + 21);
  }

  // 2. Funding Tier Badge (Clean text only, ZERO clip-art)
  const tierY = startY + 40;
  let tierBg = "#059669";
  let tierBorder = "#047857";
  if (model.fundingTier === "full_tuition") {
    tierBg = "#0284C7";
    tierBorder = "#0369A1";
  } else if (model.fundingTier === "partial") {
    tierBg = "#D97706";
    tierBorder = "#B45309";
  }

  ctx.fillStyle = tierBg;
  drawRoundRect(ctx, startX, tierY, 340, 38, 8);
  ctx.fill();
  ctx.strokeStyle = tierBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 16px Montserrat, Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(model.fundingType, startX + 170, tierY + 24);
  ctx.textAlign = "left"; // reset

  // 3. Left Side: Dark Navy Scholarship Card
  const cardX = startX;
  const cardY = tierY + 54;
  const cardH = 265;

  ctx.fillStyle = "#1E2C3A";
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();

  ctx.strokeStyle = "#F5B041";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Scholarship Title (White, High-Contrast Serif / Sans)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px 'Playfair Display', Georgia, Montserrat, Inter, serif";
  const titleY = cardY + 50;
  drawWrappedText(ctx, model.scholarshipTitle, cardX + 30, titleY, cardW - 60, 44, 3);

  // Provider Line (Clean text-only, Gold)
  ctx.fillStyle = "#F5B041";
  ctx.font = "600 22px Inter, sans-serif";
  const provText = `Provider: ${model.providerName}`;
  const truncatedProv = provText.length > 44 ? provText.slice(0, 42) + "..." : provText;
  ctx.fillText(truncatedProv, cardX + 30, cardY + cardH - 28);

  // 4. Right Side: University / Campus Hero Image
  const heroX = cardX + cardW + 20; // 612
  const heroY = startY;
  const heroW = width - heroX - 52; // 536
  const heroH = cardY + cardH - heroY; // 393

  ctx.save();
  drawRoundRect(ctx, heroX, heroY, heroW, heroH, 20);
  ctx.clip();

  if (heroImg && heroImg.width > 0) {
    // Real University / Campus Photograph (object-fit: cover)
    const imgRatio = heroImg.width / heroImg.height;
    const boxRatio = heroW / heroH;
    let sW = heroImg.width;
    let sH = heroImg.height;
    let sX = 0;
    let sY = 0;

    if (imgRatio > boxRatio) {
      sW = heroImg.height * boxRatio;
      sX = (heroImg.width - sW) / 2;
    } else {
      sH = heroImg.width / boxRatio;
      sY = (heroImg.height - sH) / 2;
    }

    ctx.drawImage(heroImg, sX, sY, sW, sH, heroX, heroY, heroW, heroH);
  } else {
    // Clean branded academic gradient fallback
    const grad = ctx.createLinearGradient(heroX, heroY, heroX + heroW, heroY + heroH);
    grad.addColorStop(0, "#1A365D");
    grad.addColorStop(1, "#0F172A");
    ctx.fillStyle = grad;
    ctx.fillRect(heroX, heroY, heroW, heroH);

    // Architectural pattern lines
    ctx.strokeStyle = "rgba(245, 176, 65, 0.15)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < heroW; i += 40) {
      ctx.beginPath();
      ctx.moveTo(heroX + i, heroY);
      ctx.lineTo(heroX + i + 100, heroY + heroH);
      ctx.stroke();
    }

    ctx.fillStyle = "#F5B041";
    ctx.font = "bold 26px Montserrat, Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(model.destinationName.toUpperCase(), heroX + heroW / 2, heroY + heroH / 2 - 20);

    ctx.fillStyle = "#E2E8F0";
    ctx.font = "600 20px Inter, sans-serif";
    ctx.fillText(model.providerName.slice(0, 32), heroX + heroW / 2, heroY + heroH / 2 + 15);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "14px Inter, sans-serif";
    ctx.fillText("Academic Institution • Verified Destination", heroX + heroW / 2, heroY + heroH / 2 + 45);
    ctx.textAlign = "left"; // reset
  }

  // University Logo in top right (if available)
  if (logoImg && logoImg.width > 0) {
    const logoCardW = 220;
    const logoCardH = 68;
    const logoCardX = heroX + heroW - logoCardW - 14;
    const logoCardY = heroY + 14;

    ctx.fillStyle = "#FFFFFF";
    drawRoundRect(ctx, logoCardX, logoCardY, logoCardW, logoCardH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const logoInnerW = logoCardW - 16;
    const logoInnerH = logoCardH - 12;
    ctx.drawImage(logoImg, logoCardX + 8, logoCardY + 6, logoInnerW, logoInnerH);
  }

  ctx.restore();

  // Golden border around hero image container
  ctx.strokeStyle = "#F5B041";
  ctx.lineWidth = 2.5;
  drawRoundRect(ctx, heroX, heroY, heroW, heroH, 20);
  ctx.stroke();
}
