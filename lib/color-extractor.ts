// Extract dominant color from an image using canvas

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function extractDominantColor(imageUrl: string): Promise<RGB> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Sample at a smaller size for performance
      const sampleSize = 50;
      canvas.width = sampleSize;
      canvas.height = sampleSize;

      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const data = imageData.data;

      // Simple color averaging with saturation weighting
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let totalWeight = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent pixels
        if (a < 128) continue;

        // Calculate saturation as weight (prefer more colorful pixels)
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const weight = 0.5 + saturation * 0.5;

        totalR += r * weight;
        totalG += g * weight;
        totalB += b * weight;
        totalWeight += weight;
      }

      if (totalWeight === 0) {
        resolve({ r: 30, g: 215, b: 96 }); // Spotify green fallback
        return;
      }

      const avgR = Math.round(totalR / totalWeight);
      const avgG = Math.round(totalG / totalWeight);
      const avgB = Math.round(totalB / totalWeight);

      // Boost saturation for more vibrant result
      const hsl = rgbToHsl(avgR, avgG, avgB);

      // If too dark or desaturated, boost it
      const boostedS = Math.min(hsl.s * 1.3, 100);
      const boostedL = Math.max(hsl.l, 35);

      // Convert back to RGB
      const boosted = hslToRgb(hsl.h, boostedS, boostedL);
      resolve(boosted);
    };

    img.onerror = () => {
      // Return Spotify green as fallback
      resolve({ r: 30, g: 215, b: 96 });
    };

    img.src = imageUrl;
  });
}

function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToCssColor(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function rgbToHslString(rgb: RGB): string {
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}
