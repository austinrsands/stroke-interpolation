const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

const SHOW_POINTS = true;
const SHOW_CONTROLS = true;
const THICKNESS = 10;
const FRAMERATE = 60;
const SEGMENT_SIZE = 2;
const STROKE_COLOR = '#121212';
const POINT_COLOR = '#1dde64';
const CONTROL_COLOR = '#00bbff';
const LINEARITY_THRESHOLD = 6;
const DISTANCE_THRESHOLD = 60;
const CONTROL_DAMPING = 3;

let strokes = [];

const midpoint = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

const distance = (p, q) => Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2));

const length = (p) => Math.sqrt(p.x * p.x + p.y * p.y);

const normalize = (p) => {
  const l = length(p);
  return l === 0 ? p : { x: p.x / l, y: p.y / l };
};

const difference = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });

const sum = (p, q) => ({ x: p.x + q.x, y: p.y + q.y });

const scale = (p, scale) => ({ x: p.x * scale, y: p.y * scale });

const dot = (p, q) => p.x * q.x + p.y * q.y;

const clearCanvas = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
};

const init = () => {
  context.lineCap = 'round';
  context.lineJoin = 'round';

  setInterval(() => requestAnimationFrame(update), 1000 / FRAMERATE);
};

const isLinearSequence = (p, q, r, threshold) => {
  const v = difference(q, p);
  const w = difference(r, q);
  const u = normalize(difference(r, p));
  const s = sum(p, scale(u, dot(v, u)));
  const l = dot(w, u);
  const d = distance(q, s);
  return d < threshold && l >= 0;
};

const simplify = (points, threshold) => {
  const simplified = [];
  let anchor;
  for (let n = 0; n < points.length; n++) {
    const current = points[n];
    const next = points[n + 1];
    if (!anchor || !next || !isLinearSequence(anchor, current, next, threshold) || distance(anchor, current) > DISTANCE_THRESHOLD) {
      anchor = current;
      simplified.push(current);
    }
  }
  return simplified;
};

const drawStroke = (points) => {
  // Save previous context state
  context.save();

  // Setup parameters
  context.strokeStyle = STROKE_COLOR;
  context.fillColor = STROKE_COLOR;
  context.lineWidth = THICKNESS;

  for (let n = 0; n < points.length; n++) {
    const p0 = points[n - 2];
    const p1 = points[n - 1];
    const p2 = points[n];
    const p3 = points[n + 1];

    // Draw dot
    if (!p0 && !p1 && p2 && !p3) {
      context.beginPath();
      context.ellipse(p2.x, p2.y, THICKNESS / 2, THICKNESS / 2, 0, 0, Math.PI * 2);
      context.fill();
    }

    // Draw line
    else if (!p0 && p1 && p2 && !p3) {
      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.lineTo(p2.x, p2.y);
      context.stroke();
    }

    // Draw quadratic bezier with right bias
    else if (!p0 && p1 && p2 && p3) {
      const c = sum(p2, scale(normalize(difference(p1, p3)), distance(p1, p2) / CONTROL_DAMPING));

      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      context.stroke();

      if (SHOW_CONTROLS) {
        context.save();
        context.strokeStyle = CONTROL_COLOR;
        context.lineWidth = THICKNESS / 2;

        context.beginPath();
        context.moveTo(c.x, c.y);
        context.lineTo(p2.x, p2.y);
        context.stroke();
        context.restore();
      }
    }

    // Draw quadratic bezier with left bias
    else if (p0 && p1 && p2 && !p3) {
      const c = sum(p1, scale(normalize(difference(p2, p0)), distance(p1, p2) / CONTROL_DAMPING));

      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      context.stroke();

      if (SHOW_CONTROLS) {
        context.save();
        context.strokeStyle = CONTROL_COLOR;
        context.lineWidth = THICKNESS / 2;

        context.beginPath();
        context.moveTo(c.x, c.y);
        context.lineTo(p1.x, p1.y);
        context.stroke();
        context.restore();
      }
    }

    // Draw cubic bezier
    else if (p0 && p1 && p2 && p3) {
      const c0 = sum(p1, scale(normalize(difference(p2, p0)), distance(p1, p2) / CONTROL_DAMPING));
      const c1 = sum(p2, scale(normalize(difference(p1, p3)), distance(p1, p2) / CONTROL_DAMPING));

      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.bezierCurveTo(c0.x, c0.y, c1.x, c1.y, p2.x, p2.y);
      context.stroke();

      if (SHOW_CONTROLS) {
        context.save();
        context.strokeStyle = CONTROL_COLOR;
        context.lineWidth = THICKNESS / 2;

        context.beginPath();
        context.moveTo(c0.x, c0.y);
        context.lineTo(p1.x, p1.y);
        context.stroke();

        context.beginPath();
        context.moveTo(c1.x, c1.y);
        context.lineTo(p2.x, p2.y);
        context.stroke();
        context.restore();
      }
    }
  }

  if (SHOW_POINTS) {
    points.forEach(point => {
      context.save();
      context.fillStyle = POINT_COLOR;
      context.beginPath();
      context.ellipse(point.x, point.y, THICKNESS, THICKNESS, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  // Restore previous context state
  context.restore();
};

const update = () => {
  clearCanvas();

  strokes.forEach((stroke) => {
    const simplified = simplify(stroke, LINEARITY_THRESHOLD);
    drawStroke(simplified);
  });
};

const getCanvasPoint = (point) => {
  const rect = canvas.getBoundingClientRect();

  const scale = {
    x: canvas.width / rect.width,
    y: canvas.height / rect.height,
  };

  const canvasPoint = {
    x: (point.x - rect.left) * scale.x,
    y: (point.y - rect.top) * scale.y,
  };

  return canvasPoint;
};

// Add event listeners
window.addEventListener('load', init);
window.addEventListener('keyup', (event) => {
  if (event.key === ' ') {
    strokes = [];
  }
  clearCanvas();
});

let lastPoint = null;
let currentStroke = null;
canvas.addEventListener('pointerdown', (event) => {
  lastPoint = getCanvasPoint({ x: event.clientX, y: event.clientY });
  currentStroke = [lastPoint];
  strokes.push(currentStroke);
});

canvas.addEventListener('pointermove', (event) => {
  if (event.buttons === 1 && currentStroke !== null) {
    const currentPoint = getCanvasPoint({ x: event.clientX, y: event.clientY });
    if (lastPoint === null || distance(lastPoint, currentPoint) > SEGMENT_SIZE) {
      lastPoint = currentPoint;
      currentStroke.push(currentPoint);
    }
  }
});

canvas.addEventListener('pointerup', (event) => {
  if (currentStroke !== null) {
    lastPoint = getCanvasPoint({ x: event.clientX, y: event.clientY });
    currentStroke.push(lastPoint);
    currentStroke = null;
  }
});
