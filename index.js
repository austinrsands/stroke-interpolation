const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

// Larger for demo
// const SHOW_POINTS = true;
// const SHOW_CONTROLS = true;
// const LINEARITY_THRESHOLD = 5;
// const DISTANCE_THRESHOLD = 1000;
// const CONTROL_DAMPING = 2;

// Smaller for actual use
const SHOW_POINTS = true;
const SHOW_CONTROLS = false;
const LINEARITY_THRESHOLD = 4;
const DISTANCE_THRESHOLD = 20;
const CONTROL_DAMPING = 2;

const THICKNESS = 30;
const FRAMERATE = 60;
const SEGMENT_SIZE = 2;
const STROKE_COLOR = '#121212';
const POINT_COLOR = '#1dde64';
const CONTROL_COLOR = '#00bbff';

let strokeSegments = [];

const midpoint = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

const distance = (p, q) =>
  Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2));

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

const areEqual = (p, q) => p.x === q.x && p.y === q.y;

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
    if (
      !anchor ||
      ((!next || !isLinearSequence(anchor, current, next, threshold)) &&
        !areEqual(anchor, current)) ||
      distance(anchor, current) > DISTANCE_THRESHOLD
    ) {
      anchor = current;
      simplified.push(current);
    }
  }
  return simplified;
};

const segmentize = (points, firstTangent, lastTangent, tension = 0.5) => {
  if (points.length === 1) return [{ p0: points[0] }];

  let tangent = firstTangent;
  const segments = [];
  for (let n = 0; n < points.length - 1; n++) {
    const p0 = points[n];
    const p1 = points[n + 1];
    const p2 = points[n + 2];
    const d = distance(p1, p0);
    const s = (d / 2) * (1 - tension);

    let c0, c1;

    if (tangent) c0 = sum(p0, scale(tangent, s));

    if (p2) tangent = normalize(difference(p2, c0 || p0));
    else if (lastTangent) tangent = lastTangent;

    if (p2 || lastTangent) c1 = difference(p1, scale(tangent, s));

    segments.push({ p0, c0, c1, p1 });
  }
  return segments;
};

const split = (segments, num) => {
  const static = segments.slice(0, -num);
  const dynamic = segments.slice(-num);
  return [static, dynamic];
};

const drawSegments = (context, segments, color, thickness) => {
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = thickness;

  segments.forEach((segment) => {
    const p0 = segment.p0;
    const c0 = segment.c0;
    const c1 = segment.c1;
    const p1 = segment.p1;

    context.beginPath();
    if (!p1) {
      context.ellipse(
        p0.x,
        p0.y,
        thickness / 2,
        thickness / 2,
        0,
        0,
        Math.PI * 2
      );
      context.fill();
    } else {
      context.moveTo(p0.x, p0.y);
      if (!c0 && !c1) context.lineTo(p1.x, p1.y);
      else if (!c0) context.quadraticCurveTo(c1.x, c1.y, p1.x, p1.y);
      else if (!c1) context.quadraticCurveTo(c0.x, c0.y, p1.x, p1.y);
      else context.bezierCurveTo(c0.x, c0.y, c1.x, c1.y, p1.x, p1.y);
      context.stroke();
    }
  });

  if (SHOW_POINTS || SHOW_CONTROLS) {
    context.save();
    context.fillStyle = '#14db4a';
    context.strokeStyle = '#1797ff';
    segments.forEach((segment) => {
      if (SHOW_CONTROLS) {
        if (segment.c0) {
          context.beginPath();
          context.moveTo(segment.p0.x, segment.p0.y);
          context.lineTo(segment.c0.x, segment.c0.y);
          context.stroke();
        }

        if (segment.c1) {
          context.beginPath();
          context.moveTo(segment.p1.x, segment.p1.y);
          context.lineTo(segment.c1.x, segment.c1.y);
          context.stroke();
        }
      }

      if (SHOW_POINTS) {
        context.beginPath();
        context.ellipse(
          segment.p0.x,
          segment.p0.y,
          thickness / 2,
          thickness / 2,
          0,
          0,
          Math.PI * 2
        );
        context.fill();
      }

      if (segment.p1) {
        context.beginPath();
        context.ellipse(
          segment.p1.x,
          segment.p1.y,
          thickness / 2,
          thickness / 2,
          0,
          0,
          Math.PI * 2
        );
        context.fill();
      }
    });
    context.restore();
  }

  context.restore();
};

const drawStroke = (points, color) => {
  // Save previous context state
  context.save();

  // Setup parameters
  context.strokeStyle = color;
  context.fillColor = color;
  context.lineWidth = THICKNESS;

  let tangent;
  for (let n = 0; n < points.length; n++) {
    const p0 = points[n - 2];
    const p1 = points[n - 1];
    const p2 = points[n];
    const p3 = points[n + 1];

    // Draw dot
    if (!p0 && !p1 && p2 && !p3) {
      context.beginPath();
      context.ellipse(
        p2.x,
        p2.y,
        THICKNESS / 2,
        THICKNESS / 2,
        0,
        0,
        Math.PI * 2
      );
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
      tangent = normalize(difference(p3, p1));
      const c = difference(
        p2,
        scale(tangent, distance(p1, p2) / CONTROL_DAMPING)
      );

      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      context.stroke();

      if (SHOW_CONTROLS) {
        context.save();
        context.strokeStyle = CONTROL_COLOR;
        context.lineWidth = THICKNESS;

        context.beginPath();
        context.moveTo(c.x, c.y);
        context.lineTo(p2.x, p2.y);
        context.stroke();
        context.restore();
      }
    }

    // Draw quadratic bezier with left bias
    else if (p0 && p1 && p2 && !p3) {
      const c = sum(p1, scale(tangent, distance(p1, p2) / CONTROL_DAMPING));
      tangent = normalize(difference(p2, c));

      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      context.stroke();

      if (SHOW_CONTROLS) {
        context.save();
        context.strokeStyle = CONTROL_COLOR;
        context.lineWidth = THICKNESS;

        context.beginPath();
        context.moveTo(c.x, c.y);
        context.lineTo(p1.x, p1.y);
        context.stroke();
        context.restore();
      }
    }

    // Draw cubic bezier
    else if (p0 && p1 && p2 && p3) {
      const c0 = sum(p1, scale(tangent, distance(p1, p2) / CONTROL_DAMPING));

      tangent = normalize(difference(p3, c0));
      const c1 = difference(
        p2,
        scale(tangent, distance(p1, p2) / CONTROL_DAMPING)
      );

      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.bezierCurveTo(c0.x, c0.y, c1.x, c1.y, p2.x, p2.y);
      context.stroke();

      if (SHOW_CONTROLS) {
        context.save();
        context.strokeStyle = CONTROL_COLOR;
        context.lineWidth = THICKNESS;

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
    points.forEach((point) => {
      context.save();
      context.fillStyle = POINT_COLOR;
      context.beginPath();
      context.ellipse(
        point.x,
        point.y,
        THICKNESS,
        THICKNESS,
        0,
        0,
        Math.PI * 2
      );
      context.fill();
      context.restore();
    });
  }

  // Restore previous context state
  context.restore();
};

const update = () => {
  clearCanvas();

  strokeSegments.forEach((strokeSegment) => {
    const points = simplify(strokeSegment.points, LINEARITY_THRESHOLD);
    const segments = segmentize(points);
    const [static, dynamic] = split(segments, 5);
    drawSegments(context, static, 'red', THICKNESS);
    drawSegments(context, dynamic, 'black', THICKNESS);
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
    strokeSegments = [];
  }
  clearCanvas();
});

let lastPoint = null;
let currentStroke = null;
canvas.addEventListener('pointerdown', (event) => {
  lastPoint = getCanvasPoint({ x: event.clientX, y: event.clientY });
  currentStroke = {
    points: [lastPoint],
  };
  strokeSegments.push(currentStroke);
});

canvas.addEventListener('pointermove', (event) => {
  if (event.buttons === 1 && currentStroke !== null) {
    const currentPoint = getCanvasPoint({ x: event.clientX, y: event.clientY });
    if (
      lastPoint === null ||
      distance(lastPoint, currentPoint) > SEGMENT_SIZE
    ) {
      lastPoint = currentPoint;
      currentStroke.points.push(currentPoint);
    }
  }
});

canvas.addEventListener('pointerup', (event) => {
  if (currentStroke !== null) {
    lastPoint = getCanvasPoint({ x: event.clientX, y: event.clientY });
    currentStroke.points.push(lastPoint);
    currentStroke = null;
  }
});
