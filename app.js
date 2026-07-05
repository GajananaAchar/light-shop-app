const products = [
  {
    id: "aurora-ring",
    name: "Aurora Ring Chandelier",
    category: "ceiling",
    type: "Ceiling light",
    price: "Rs 8,500",
    image: "assets/ring.png",
    glb: "assets/ring.glb",
    usdz: "assets/ring.usdz",
    mount: "ceiling",
    width: 250,
    description: "A warm circular chandelier for living rooms, lounges, and premium dining spaces."
  },
  {
    id: "matte-pendant",
    name: "Matte Cone Pendant",
    category: "ceiling",
    type: "Pendant light",
    price: "Rs 3,200",
    image: "assets/pendant.png",
    glb: "assets/pendant.glb",
    usdz: "assets/pendant.usdz",
    mount: "ceiling",
    width: 178,
    description: "A focused pendant with a soft golden throw for kitchen counters and dining tables."
  },
  {
    id: "opal-sconce",
    name: "Opal Wall Sconce",
    category: "wall",
    type: "Wall light",
    price: "Rs 2,150",
    image: "assets/sconce.png",
    glb: "assets/sconce.glb",
    usdz: "assets/sconce.usdz",
    mount: "wall",
    width: 138,
    description: "A slim wall fixture for bedrooms, hallways, mirrors, and warm accent corners."
  },
  {
    id: "heritage-chandelier",
    name: "Heritage Ring Gold",
    category: "decor",
    type: "Decor ceiling light",
    price: "Rs 6,900",
    image: "assets/ring.png",
    glb: "assets/ring.glb",
    usdz: "assets/ring.usdz",
    mount: "ceiling",
    width: 270,
    description: "A premium gold ring design that adds a decorative glow to family spaces."
  },
  {
    id: "cove-strip",
    name: "Cove LED Strip",
    category: "decor",
    type: "LED strip",
    price: "Rs 950 / meter",
    image: "assets/strip.png",
    glb: "assets/strip.glb",
    usdz: "assets/strip.usdz",
    mount: "strip",
    width: 300,
    description: "Flexible strip lighting for ceilings, shelves, TV panels, and display counters."
  },
  {
    id: "focus-spot",
    name: "Focus Pendant Spot",
    category: "ceiling",
    type: "Pendant spotlight",
    price: "Rs 1,850",
    image: "assets/pendant.png",
    glb: "assets/pendant.glb",
    usdz: "assets/pendant.usdz",
    mount: "ceiling",
    width: 158,
    description: "A clean directional pendant for showrooms, product walls, and modern home interiors."
  }
];

const catalogGrid = document.querySelector("#catalogGrid");
const selectedName = document.querySelector("#selectedName");
const selectedDescription = document.querySelector("#selectedDescription");
const selectedType = document.querySelector("#selectedType");
const selectedPrice = document.querySelector("#selectedPrice");
const selectedIcon = document.querySelector("#selectedIcon");
const placedLight = document.querySelector("#placedLight");
const lightGlow = document.querySelector("#lightGlow");
const contactShadow = document.querySelector("#contactShadow");
const mountLine = document.querySelector("#mountLine");
const arCanvas = document.querySelector("#arCanvas");
const nativeArButton = document.querySelector("#nativeArButton");
const cameraButton = document.querySelector("#cameraButton");
const resetButton = document.querySelector("#resetButton");
const closeCameraButton = document.querySelector("#closeCameraButton");
const rescanCameraButton = document.querySelector("#rescanCameraButton");
const camera = document.querySelector("#camera");
const fallbackRoom = document.querySelector("#fallbackRoom");
const cameraStatus = document.querySelector("#cameraStatus");
const placementArea = document.querySelector("#placementArea");
const filters = document.querySelectorAll(".filter");
const visionCanvas = document.createElement("canvas");
const visionContext = visionCanvas.getContext("2d", { willReadFrequently: true });
const trackingCanvas = document.createElement("canvas");
const trackingContext = trackingCanvas.getContext("2d", { willReadFrequently: true });

let selectedProduct = products[0];
let activeStream = null;
let dragging = false;
let locked = false;
let scanning = false;
let dragOffset = { x: 0, y: 0 };
let anchor = { x: 50, y: 18 };
let renderState = { x: 50, y: 18, vx: 0, vy: 0 };
let renderScale = 1;
let targetScale = 1;
let scaleVelocity = 0;
let target = { x: 50, y: 18 };
let lastTime = performance.now();
let lastVideoScan = 0;
let lastTrackTime = 0;
let trackingPatch = null;
let trackerConfidence = 0;
let surfaceLock = { side: "center", type: "ceiling" };
let xrSession = null;
let xrRefSpace = null;
let xrViewerSpace = null;
let xrHitTestSource = null;
let xrGl = null;
let xrProgram = null;
let xrTexture = null;
let xrAnchorMatrix = null;
let xrVertexBuffer = null;
let xrPlaced = false;

const fallbackAnchors = {
  ceiling: { x: 50, y: 17 },
  wall: { x: 68, y: 38 },
  strip: { x: 50, y: 14 }
};

function productPhoto(product, className = "product-photo") {
  return `<img class="${className}" src="${product.image}" alt="${product.name}" loading="lazy" />`;
}

function absoluteAssetUrl(path) {
  return new URL(path, window.location.href).href;
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent);
}

function openNativeAR() {
  const glbUrl = absoluteAssetUrl(selectedProduct.glb);
  const usdzUrl = absoluteAssetUrl(selectedProduct.usdz);

  if (isIosDevice()) {
    const link = document.createElement("a");
    link.setAttribute("rel", "ar");
    link.setAttribute("href", usdzUrl);
    link.style.display = "none";
    const image = document.createElement("img");
    image.setAttribute("alt", selectedProduct.name);
    link.appendChild(image);
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  if (isAndroidDevice()) {
    const sceneViewer = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glbUrl)}&mode=ar_preferred&title=${encodeURIComponent(selectedProduct.name)}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(glbUrl)};end;`;
    window.location.href = sceneViewer;
    return;
  }

  cameraStatus.textContent = "Open this page on iPhone or Android to launch the phone's real AR viewer.";
}

function renderCatalog(filter = "all") {
  const visibleProducts = filter === "all" ? products : products.filter((product) => product.category === filter);
  catalogGrid.innerHTML = visibleProducts
    .map((product) => `
      <article class="product-card" data-category="${product.category}">
        <div class="product-art">${productPhoto(product)}</div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="meta-row">
          <span>${product.type}</span>
          <strong>${product.price}</strong>
        </div>
        <button class="select-button" type="button" data-product="${product.id}">Try in room</button>
      </article>
    `)
    .join("");
}

function selectProduct(productId, shouldScroll = true) {
  selectedProduct = products.find((product) => product.id === productId) || products[0];
  selectedName.textContent = selectedProduct.name;
  selectedDescription.textContent = selectedProduct.description;
  selectedType.textContent = selectedProduct.type;
  selectedPrice.textContent = selectedProduct.price;
  selectedIcon.src = selectedProduct.image;
  selectedIcon.alt = selectedProduct.name;
  placedLight.innerHTML = productPhoto(selectedProduct, "placed-photo");
  document.body.dataset.mount = selectedProduct.mount;
  if (xrGl) {
    loadTexture(xrGl, selectedProduct.image).then((texture) => {
      xrTexture = texture;
      updateXrGeometry();
    });
  }
  lockToPoint(fallbackAnchors[selectedProduct.mount], true);

  if (shouldScroll) {
    document.querySelector("#preview").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function clampToMount(point, mount = selectedProduct.mount) {
  if (mount === "ceiling") {
    return { x: Math.max(8, Math.min(92, point.x)), y: Math.max(4, Math.min(30, point.y)) };
  }

  if (mount === "wall") {
    return { x: Math.max(7, Math.min(93, point.x)), y: Math.max(14, Math.min(82, point.y)) };
  }

  return { x: Math.max(5, Math.min(95, point.x)), y: Math.max(5, Math.min(24, point.y)) };
}

function lockToPoint(point, immediate = false) {
  anchor = clampToMount(point);
  target = { ...anchor };
  targetScale = 1;
  renderScale = immediate ? 1 : renderScale;
  scaleVelocity = 0;
  surfaceLock = {
    type: selectedProduct.mount,
    side: anchor.x < 38 ? "left" : anchor.x > 62 ? "right" : "center"
  };
  locked = true;
  scanning = false;
  cameraStatus.textContent =
    selectedProduct.mount === "ceiling"
      ? "Ceiling detected. Light is fixed to the top area. Drag only if the customer wants another spot."
      : selectedProduct.mount === "wall"
        ? "Wall detected. Light is fixed to the wall. Drag only if the customer wants another spot."
        : "Cove line detected. LED strip is fixed along the top wall line.";

  if (immediate) {
    renderState = { x: anchor.x, y: anchor.y, vx: 0, vy: 0 };
    renderScale = 1;
  }

  captureTrackingPatch();
}

function drawTrackingFrame() {
  if (!activeStream || camera.readyState < 2 || !trackingContext) return false;
  trackingCanvas.width = 120;
  trackingCanvas.height = 90;
  trackingContext.drawImage(camera, 0, 0, trackingCanvas.width, trackingCanvas.height);
  return true;
}

function luminanceAt(data, width, x, y) {
  const index = (y * width + x) * 4;
  return data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
}

function percentToTrackPixel(point) {
  return {
    x: Math.round((point.x / 100) * trackingCanvas.width),
    y: Math.round((point.y / 100) * trackingCanvas.height)
  };
}

function captureTrackingPatch() {
  trackingPatch = null;
  trackerConfidence = 0;
  if (!drawTrackingFrame()) return;

  const patchSize = 17;
  const half = Math.floor(patchSize / 2);
  const center = percentToTrackPixel(anchor);
  const source = trackingContext.getImageData(0, 0, trackingCanvas.width, trackingCanvas.height).data;
  const values = [];

  if (
    center.x < half ||
    center.y < half ||
    center.x >= trackingCanvas.width - half ||
    center.y >= trackingCanvas.height - half
  ) {
    return;
  }

  for (let y = -half; y <= half; y += 1) {
    for (let x = -half; x <= half; x += 1) {
      values.push(luminanceAt(source, trackingCanvas.width, center.x + x, center.y + y));
    }
  }

  trackingPatch = {
    values,
    size: patchSize,
    half,
    x: center.x,
    y: center.y,
    scale: 1
  };
}

function trackLockedPoint() {
  if (!trackingPatch || dragging || scanning || !locked || !drawTrackingFrame()) return;

  const source = trackingContext.getImageData(0, 0, trackingCanvas.width, trackingCanvas.height).data;
  const searchRadius = selectedProduct.mount === "ceiling" ? 18 : 20;
  const { half, size, values } = trackingPatch;
  const scaleGuesses = [0.72, 0.82, 0.92, 1, 1.1, 1.22, 1.36];
  let best = { score: Number.POSITIVE_INFINITY, x: trackingPatch.x, y: trackingPatch.y, scale: trackingPatch.scale || 1 };

  for (let y = trackingPatch.y - searchRadius; y <= trackingPatch.y + searchRadius; y += 2) {
    for (let x = trackingPatch.x - searchRadius; x <= trackingPatch.x + searchRadius; x += 2) {
      for (const scale of scaleGuesses) {
        if (
          x - half * scale < 1 ||
          y - half * scale < 1 ||
          x + half * scale >= trackingCanvas.width - 1 ||
          y + half * scale >= trackingCanvas.height - 1
        ) {
          continue;
        }

        let score = 0;
        let i = 0;

        for (let py = -half; py <= half; py += 2) {
          for (let px = -half; px <= half; px += 2) {
            const scaledX = Math.round(x + px * scale);
            const scaledY = Math.round(y + py * scale);
            const current = luminanceAt(source, trackingCanvas.width, scaledX, scaledY);
            const previous = values[(py + half) * size + (px + half)];
            score += Math.abs(current - previous);
            i += 1;
          }
        }

        score = score / i + Math.abs(scale - (trackingPatch.scale || 1)) * 5;
        if (score < best.score) {
          best = { score, x, y, scale };
        }
      }
    }
  }

  trackerConfidence = Math.max(0, Math.min(1, 1 - best.score / 42));
  if (trackerConfidence < 0.16) {
    target = clampToSurfaceLock(target);
    targetScale = Math.max(0.68, Math.min(1.55, targetScale));
    return;
  }

  trackingPatch.x = best.x;
  trackingPatch.y = best.y;
  trackingPatch.scale = best.scale;
  targetScale = Math.max(0.68, Math.min(1.55, targetScale * 0.72 + best.scale * 0.28));
  const trackedPoint = clampToSurfaceLock(clampToMount({
    x: (best.x / trackingCanvas.width) * 100,
    y: (best.y / trackingCanvas.height) * 100
  }));
  anchor = trackedPoint;
  target = trackedPoint;
}

function clampToSurfaceLock(point) {
  if (!surfaceLock || surfaceLock.type !== selectedProduct.mount) return point;

  if (surfaceLock.type === "ceiling") {
    return {
      x: Math.max(16, Math.min(84, point.x)),
      y: Math.max(5, Math.min(20, point.y))
    };
  }

  if (surfaceLock.type === "strip") {
    return {
      x: Math.max(8, Math.min(92, point.x)),
      y: Math.max(6, Math.min(17, point.y))
    };
  }

  const sideBounds = {
    left: [8, 42],
    center: [30, 70],
    right: [58, 92]
  };
  const [minX, maxX] = sideBounds[surfaceLock.side] || sideBounds.center;
  return {
    x: Math.max(minX, Math.min(maxX, point.x)),
    y: Math.max(18, Math.min(76, point.y))
  };
}

function estimateWallAnchorFromPixels(pixels, width, height) {
  const candidates = [];
  const startY = Math.round(height * 0.24);
  const endY = Math.round(height * 0.76);
  const startX = Math.round(width * 0.08);
  const endX = Math.round(width * 0.92);

  for (let y = startY; y < endY; y += 3) {
    for (let x = startX; x < endX; x += 3) {
      const center = luminanceAt(pixels, width, x, y);
      const left = luminanceAt(pixels, width, Math.max(1, x - 3), y);
      const right = luminanceAt(pixels, width, Math.min(width - 2, x + 3), y);
      const top = luminanceAt(pixels, width, x, Math.max(1, y - 3));
      const bottom = luminanceAt(pixels, width, x, Math.min(height - 2, y + 3));
      const contrast = Math.abs(left - right) + Math.abs(top - bottom);
      const brightness = center > 185 ? 10 : 0;
      const centerPenalty = 1 - Math.min(0.65, Math.abs(x / width - 0.5));
      const score = (contrast + brightness) * (1.25 - centerPenalty * 0.35);

      if (score > 34) {
        candidates.push({ x, y, score });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  if (!best) {
    return { x: 68, y: 38 };
  }

  return {
    x: (best.x / width) * 100,
    y: (best.y / height) * 100
  };
}

function estimateAnchorFromVideo() {
  if (!activeStream || camera.readyState < 2 || !visionContext) {
    return fallbackAnchors[selectedProduct.mount];
  }

  const width = 80;
  const height = 120;
  visionCanvas.width = width;
  visionCanvas.height = height;
  visionContext.drawImage(camera, 0, 0, width, height);
  const pixels = visionContext.getImageData(0, 0, width, height).data;
  const rowScores = [];

  for (let y = 8; y < height - 8; y += 1) {
    let diff = 0;
    for (let x = 10; x < width - 10; x += 2) {
      const top = ((y - 4) * width + x) * 4;
      const bottom = ((y + 4) * width + x) * 4;
      const topLum = pixels[top] * 0.299 + pixels[top + 1] * 0.587 + pixels[top + 2] * 0.114;
      const bottomLum = pixels[bottom] * 0.299 + pixels[bottom + 1] * 0.587 + pixels[bottom + 2] * 0.114;
      diff += Math.abs(topLum - bottomLum);
    }
    rowScores.push({ y, diff });
  }

  rowScores.sort((a, b) => b.diff - a.diff);
  const strongestLine = rowScores[0]?.y || Math.round(height * 0.32);
  const boundaryPercent = (strongestLine / height) * 100;

  if (selectedProduct.mount === "ceiling") {
    return { x: 50, y: Math.max(10, Math.min(22, boundaryPercent * 0.42)) };
  }

  if (selectedProduct.mount === "wall") {
    return clampToMount(estimateWallAnchorFromPixels(pixels, width, height), "wall");
  }

  return { x: 50, y: Math.max(10, Math.min(17, boundaryPercent * 0.38)) };
}

function startAutoScan() {
  scanning = true;
  locked = false;
  targetScale = 1;
  cameraStatus.textContent = "Scanning. Keep the phone steady for a moment.";

  window.setTimeout(() => {
    lockToPoint(estimateAnchorFromVideo(), false);
  }, activeStream ? 1200 : 700);
}

function enterCameraMode() {
  document.body.classList.add("camera-live", "ar-mode");
  window.scrollTo({ top: document.querySelector("#preview").offsetTop, behavior: "auto" });
}

function stopCamera() {
  if (xrSession) {
    xrSession.end();
  }
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
  }
  activeStream = null;
  trackingPatch = null;
  trackerConfidence = 0;
  targetScale = 1;
  renderScale = 1;
  camera.srcObject = null;
  camera.style.display = "none";
  fallbackRoom.style.display = "block";
  document.body.classList.remove("camera-live", "ar-mode");
  cameraButton.textContent = "Open camera & scan";
  resetButton.textContent = "Re-scan";
  cameraStatus.textContent = "Choose a light, open the camera, and the app will lock it to the right wall or ceiling area.";
}

async function startCamera() {
  if (await startTrueAR()) {
    return;
  }

  if (activeStream) {
    enterCameraMode();
    startAutoScan();
    return;
  }

  try {
    activeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    camera.srcObject = activeStream;
    camera.style.display = "block";
    fallbackRoom.style.display = "none";
    enterCameraMode();
    cameraButton.textContent = "Scan again";
    resetButton.textContent = "Change lock";
    startAutoScan();
  } catch (error) {
    document.body.classList.remove("camera-live", "ar-mode");
    cameraStatus.textContent = "Camera could not start. The sample room will still auto-lock the light.";
    startAutoScan();
  }
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Shader compile failed");
  }
  return shader;
}

function createProgram(gl) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, `
    attribute vec3 a_position;
    attribute vec2 a_uv;
    uniform mat4 u_matrix;
    varying vec2 v_uv;
    void main() {
      gl_Position = u_matrix * vec4(a_position, 1.0);
      v_uv = a_uv;
    }
  `);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_uv;
    void main() {
      vec4 color = texture2D(u_texture, v_uv);
      if (color.a < 0.05) discard;
      gl_FragColor = color;
    }
  `);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
  }
  return program;
}

async function loadTexture(gl, url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return texture;
}

function multiplyMatrix(a, b) {
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      out[column * 4 + row] =
        a[0 * 4 + row] * b[column * 4 + 0] +
        a[1 * 4 + row] * b[column * 4 + 1] +
        a[2 * 4 + row] * b[column * 4 + 2] +
        a[3 * 4 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

function productQuadVertices() {
  const baseWidth = selectedProduct.mount === "strip" ? 1.15 : selectedProduct.mount === "wall" ? 0.38 : 0.72;
  const baseHeight = selectedProduct.mount === "strip" ? 0.16 : selectedProduct.mount === "wall" ? 0.58 : 0.48;
  const w = baseWidth / 2;
  const h = baseHeight / 2;
  return new Float32Array([
    -w, -h, 0, 0, 1,
     w, -h, 0, 1, 1,
    -w,  h, 0, 0, 0,
    -w,  h, 0, 0, 0,
     w, -h, 0, 1, 1,
     w,  h, 0, 1, 0
  ]);
}

function updateXrGeometry() {
  if (!xrGl || !xrVertexBuffer) return;
  xrGl.bindBuffer(xrGl.ARRAY_BUFFER, xrVertexBuffer);
  xrGl.bufferData(xrGl.ARRAY_BUFFER, productQuadVertices(), xrGl.STATIC_DRAW);
}

async function startTrueAR() {
  if (!navigator.xr || xrSession) {
    return false;
  }

  let supported = false;
  try {
    supported = await navigator.xr.isSessionSupported("immersive-ar");
  } catch (error) {
    supported = false;
  }

  if (!supported) {
    return false;
  }

  try {
    xrGl = arCanvas.getContext("webgl", { alpha: true, antialias: true, xrCompatible: true });
    await xrGl.makeXRCompatible();
    xrProgram = createProgram(xrGl);
    xrTexture = await loadTexture(xrGl, selectedProduct.image);
    xrVertexBuffer = xrGl.createBuffer();
    updateXrGeometry();

    xrSession = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: document.body }
    });
    xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, xrGl) });
    xrRefSpace = await xrSession.requestReferenceSpace("local");
    xrViewerSpace = await xrSession.requestReferenceSpace("viewer");
    xrHitTestSource = await xrSession.requestHitTestSource({ space: xrViewerSpace });
    xrPlaced = false;
    xrAnchorMatrix = null;
    document.body.classList.add("xr-live", "ar-mode");
    cameraButton.textContent = "AR active";
    resetButton.textContent = "Place again";
    cameraStatus.textContent = "Move the phone slowly. Tap the camera area once to set the light in real AR.";
    xrSession.addEventListener("end", stopTrueAR);
    xrSession.requestAnimationFrame(onXrFrame);
    return true;
  } catch (error) {
    stopTrueAR();
    return false;
  }
}

function stopTrueAR() {
  document.body.classList.remove("xr-live", "ar-mode");
  xrSession = null;
  xrRefSpace = null;
  xrViewerSpace = null;
  xrHitTestSource = null;
  xrAnchorMatrix = null;
  xrPlaced = false;
}

function onXrFrame(time, frame) {
  const session = frame.session;
  session.requestAnimationFrame(onXrFrame);
  const pose = frame.getViewerPose(xrRefSpace);
  if (!pose) return;

  const hitResults = xrHitTestSource && !xrPlaced ? frame.getHitTestResults(xrHitTestSource) : [];
  if (hitResults.length > 0) {
    const hitPose = hitResults[0].getPose(xrRefSpace);
    xrAnchorMatrix = hitPose.transform.matrix;
  }

  const layer = session.renderState.baseLayer;
  xrGl.bindFramebuffer(xrGl.FRAMEBUFFER, layer.framebuffer);
  xrGl.clearColor(0, 0, 0, 0);
  xrGl.clear(xrGl.COLOR_BUFFER_BIT | xrGl.DEPTH_BUFFER_BIT);
  xrGl.enable(xrGl.BLEND);
  xrGl.blendFunc(xrGl.SRC_ALPHA, xrGl.ONE_MINUS_SRC_ALPHA);
  xrGl.useProgram(xrProgram);
  xrGl.bindTexture(xrGl.TEXTURE_2D, xrTexture);
  xrGl.bindBuffer(xrGl.ARRAY_BUFFER, xrVertexBuffer);

  const position = xrGl.getAttribLocation(xrProgram, "a_position");
  const uv = xrGl.getAttribLocation(xrProgram, "a_uv");
  const matrixLocation = xrGl.getUniformLocation(xrProgram, "u_matrix");
  xrGl.enableVertexAttribArray(position);
  xrGl.enableVertexAttribArray(uv);
  xrGl.vertexAttribPointer(position, 3, xrGl.FLOAT, false, 20, 0);
  xrGl.vertexAttribPointer(uv, 2, xrGl.FLOAT, false, 20, 12);

  if (xrAnchorMatrix) {
    for (const view of pose.views) {
      const viewport = layer.getViewport(view);
      xrGl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
      const viewProjection = multiplyMatrix(view.projectionMatrix, view.transform.inverse.matrix);
      const mvp = multiplyMatrix(viewProjection, xrAnchorMatrix);
      xrGl.uniformMatrix4fv(matrixLocation, false, mvp);
      xrGl.drawArrays(xrGl.TRIANGLES, 0, 6);
    }
  }
}

function updateVisuals(x = renderState.x, y = renderState.y) {
  const width = selectedProduct.width * renderScale;
  const mount = selectedProduct.mount;
  const glowWidth = mount === "strip" ? width * 1.35 : width * 1.22;
  const glowHeight = mount === "strip" ? 58 : width * 0.74;
  const shadowWidth = mount === "wall" ? width * 0.6 : mount === "strip" ? width * 0.85 : width * 0.48;

  placedLight.style.left = `${x}%`;
  placedLight.style.top = `${y}%`;
  placedLight.style.width = `${width}px`;
  placedLight.style.transform = `translate(-50%, -50%) scale(${dragging ? 1.03 : 1})`;

  lightGlow.style.left = `${x}%`;
  lightGlow.style.top = `${y + (mount === "ceiling" ? 5 : 0)}%`;
  lightGlow.style.width = `${glowWidth}px`;
  lightGlow.style.height = `${glowHeight}px`;
  lightGlow.style.opacity = locked ? 0.66 : 0.28;

  contactShadow.style.left = `${x}%`;
  contactShadow.style.top = `${y + (mount === "ceiling" ? 9 : 4)}%`;
  contactShadow.style.width = `${shadowWidth}px`;
  contactShadow.style.height = `${Math.max(10, width * 0.1)}px`;

  mountLine.style.left = `${x}%`;
  mountLine.style.top = mount === "wall" ? `${Math.max(21, y - 12)}%` : "0";
  mountLine.style.height = mount === "ceiling" ? `${Math.max(17, y)}%` : mount === "wall" ? "12%" : "0";
  mountLine.style.opacity = mount === "strip" ? 0 : locked ? 0.4 : 0.12;

}

function animate(now = performance.now()) {
  const delta = Math.min((now - lastTime) / 16.67, 2);
  lastTime = now;

  if (scanning && activeStream && now - lastVideoScan > 260) {
    lastVideoScan = now;
    target = clampToMount(estimateAnchorFromVideo());
  }

  if (!scanning && activeStream && locked && now - lastTrackTime > 90) {
    lastTrackTime = now;
    trackLockedPoint();
  }

  if (!dragging) {
    renderState.vx += (target.x - renderState.x) * 0.12 * delta;
    renderState.vy += (target.y - renderState.y) * 0.12 * delta;
    renderState.vx *= 0.72;
    renderState.vy *= 0.72;
    renderState.x += renderState.vx * delta;
    renderState.y += renderState.vy * delta;
    scaleVelocity += (targetScale - renderScale) * 0.1 * delta;
    scaleVelocity *= 0.76;
    renderScale += scaleVelocity * delta;
  }

  updateVisuals();
  requestAnimationFrame(animate);
}

function pointerPosition(event) {
  const rect = placementArea.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100
  };
}

catalogGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product]");
  if (button) {
    selectProduct(button.dataset.product);
  }
});

filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((filter) => filter.classList.remove("active"));
    button.classList.add("active");
    renderCatalog(button.dataset.filter);
  });
});

cameraButton.addEventListener("click", startCamera);
nativeArButton.addEventListener("click", openNativeAR);
resetButton.addEventListener("click", () => {
  if (xrSession) {
    xrPlaced = false;
    xrAnchorMatrix = null;
    cameraStatus.textContent = "Move the phone slowly. Tap the camera area once to set the light in real AR.";
    return;
  }
  startAutoScan();
});

closeCameraButton.addEventListener("click", stopCamera);
rescanCameraButton.addEventListener("click", startAutoScan);

arCanvas.addEventListener("click", () => {
  if (!xrSession || !xrAnchorMatrix) return;
  xrPlaced = true;
  cameraStatus.textContent = "Light is fixed in real AR. Walk around and it should stay in that place.";
});

placedLight.addEventListener("pointerdown", (event) => {
  dragging = true;
  placedLight.setPointerCapture(event.pointerId);
  const point = pointerPosition(event);
  dragOffset = { x: renderState.x - point.x, y: renderState.y - point.y };
  cameraStatus.textContent = "Move the light to another place. Release to lock it there.";
});

placedLight.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const point = pointerPosition(event);
  const mountedPoint = clampToMount({
    x: point.x + dragOffset.x,
    y: point.y + dragOffset.y
  });
  renderState.x = mountedPoint.x;
  renderState.y = mountedPoint.y;
  target = mountedPoint;
  anchor = mountedPoint;
  updateVisuals();
});

function releaseLight() {
  if (!dragging) return;
  dragging = false;
  lockToPoint(anchor, false);
}

placedLight.addEventListener("pointerup", releaseLight);
placedLight.addEventListener("pointercancel", releaseLight);

placementArea.addEventListener("click", (event) => {
  if (event.target.closest("#placedLight")) return;
  lockToPoint(pointerPosition(event), false);
});

renderCatalog();
selectProduct(products[0].id, false);
requestAnimationFrame(animate);
