// script.js

// DOM Elements
const video = document.getElementById("video");
const asciiCanvas = document.getElementById("asciiCanvas");
const pixelCanvas = document.getElementById("pixelCanvas");
const paletteCanvas = document.getElementById("paletteCanvas");
const imageUpload = document.getElementById("imageUpload");

const asciiBtn = document.getElementById("asciiMode");
const pixelBtn = document.getElementById("pixelMode");
const exportBtn = document.getElementById("exportPixel");
const paletteBtn = document.getElementById("extractPalette");
const filterSelect = document.getElementById("pixelFilter");
const resolutionSlider = document.getElementById("pixelResolution");

// Setup canvas contexts
const asciiCtx = asciiCanvas.getContext("2d");
const pixelCtx = pixelCanvas.getContext("2d");
const paletteCtx = paletteCanvas.getContext("2d");

// Start webcam
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  video.srcObject = stream;
});

// ASCII characters by brightness
const asciiChars = "@#S%?*+;:,.";

function drawAsciiFrame() {
  const width = 100;
  const height = 75;
  asciiCanvas.width = width * 6;
  asciiCanvas.height = height * 10;
  asciiCtx.clearRect(0, 0, asciiCanvas.width, asciiCanvas.height);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(video, 0, 0, width, height);
  const frame = tempCtx.getImageData(0, 0, width, height);

  asciiCtx.font = "10px monospace";
  asciiCtx.fillStyle = "white";

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = frame.data[i];
      const g = frame.data[i + 1];
      const b = frame.data[i + 2];
      const brightness = (r + g + b) / 3;
      const char = asciiChars[Math.floor((brightness / 255) * (asciiChars.length - 1))];
      asciiCtx.fillText(char, x * 6, y * 10);
    }
  }
  requestAnimationFrame(drawAsciiFrame);
}

let previousFrame;

function drawPixelFrame() {
  const res = parseInt(resolutionSlider.value);
  const w = pixelCanvas.width = 500;
  const h = pixelCanvas.height = 500;

  const smallCanvas = document.createElement("canvas");
  smallCanvas.width = res;
  smallCanvas.height = res;
  const smallCtx = smallCanvas.getContext("2d");

  smallCtx.drawImage(video, 0, 0, res, res);
  let imgData = smallCtx.getImageData(0, 0, res, res);

  applyFilter(imgData);

  smallCtx.putImageData(imgData, 0, 0);

  pixelCtx.imageSmoothingEnabled = false;
  if (filterSelect.value === "motiontrail" && previousFrame) {
    pixelCtx.globalAlpha = 0.2;
    pixelCtx.drawImage(previousFrame, 0, 0, w, h);
    pixelCtx.globalAlpha = 1.0;
  }
  pixelCtx.clearRect(0, 0, w, h);
  pixelCtx.drawImage(smallCanvas, 0, 0, w, h);

  previousFrame = smallCanvas;

  requestAnimationFrame(drawPixelFrame);
}

function applyFilter(imgData) {
  const filter = filterSelect.value;
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    if (filter === "grayscale") {
      let avg = (r + g + b) / 3;
      data[i] = data[i+1] = data[i+2] = avg;
    } else if (filter === "sepia") {
      data[i] = Math.min(255, 0.393*r + 0.769*g + 0.189*b);
      data[i+1] = Math.min(255, 0.349*r + 0.686*g + 0.168*b);
      data[i+2] = Math.min(255, 0.272*r + 0.534*g + 0.131*b);
    } else if (filter === "invert") {
      data[i] = 255 - r;
      data[i+1] = 255 - g;
      data[i+2] = 255 - b;
    } else if (filter === "highcontrast") {
      let factor = (259 * (128 + 255)) / (255 * (259 - 128));
      data[i] = truncate(factor * (r - 128) + 128);
      data[i+1] = truncate(factor * (g - 128) + 128);
      data[i+2] = truncate(factor * (b - 128) + 128);
    } else if (filter === "oldtv") {
      let avg = (r + g + b) / 3;
      let noise = (Math.random() - 0.5) * 50;
      avg = truncate(avg + noise);
      data[i] = data[i+1] = data[i+2] = avg;
    } else if (filter === "randomcolor") {
      data[i] = Math.random() * 255;
      data[i+1] = Math.random() * 255;
      data[i+2] = Math.random() * 255;
    } else if (filter === "gameboy") {
      let gray = (r + g + b) / 3;
      let color = gray > 200 ? 255 : gray > 100 ? 170 : gray > 50 ? 85 : 34;
      data[i] = data[i+1] = data[i+2] = color;
    }
  }
}

function truncate(value) {
  return Math.min(255, Math.max(0, value));
}

function extractPalette(source) {
  const w = 300;
  const h = 300;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(source, 0, 0, w, h);

  const colors = [];
  for (let y = 1; y <= 3; y++) {
    for (let x = 1; x <= 4; x++) {
      const px = Math.floor((x / 5) * w);
      const py = Math.floor((y / 4) * h);
      const data = tempCtx.getImageData(px, py, 1, 1).data;
      colors.push(`rgb(${data[0]}, ${data[1]}, ${data[2]})`);
    }
  }

  paletteCanvas.width = 600;
  paletteCanvas.height = 50;
  paletteCtx.clearRect(0, 0, 600, 50);
  colors.forEach((color, i) => {
    paletteCtx.fillStyle = color;
    paletteCtx.fillRect(i * 50, 0, 50, 50);
  });
}

asciiBtn.addEventListener("click", () => {
  asciiCanvas.classList.remove("hidden");
  pixelCanvas.classList.add("hidden");
});

pixelBtn.addEventListener("click", () => {
  asciiCanvas.classList.add("hidden");
  pixelCanvas.classList.remove("hidden");
});

exportBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "pixel_art.png";
  link.href = pixelCanvas.toDataURL("image/png");
  link.click();
});

paletteBtn.addEventListener("click", () => extractPalette(video));

imageUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  const img = new Image();
  img.onload = () => extractPalette(img);
  img.src = URL.createObjectURL(file);
});
document.getElementById("savePalette").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "palette.png";
  link.href = paletteCanvas.toDataURL("image/png");
  link.click();
});


// Start animation loops
drawAsciiFrame();
drawPixelFrame();
