const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

const RADIUS = 10;
const FRAMERATE = 60;
const SEGMENT_SIZE = 5;
const DAMPING = 2;
const THRESHOLD = 5;
const CONTROL_COLOR = '#00bbff';

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
  context.lineWidth = RADIUS * 2;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  setInterval(() => requestAnimationFrame(update), 1000 / FRAMERATE);
};

const isInlineCenter = (p1, p2, p3, threshold) => {
  const v = difference(p2, p1);
  const u = normalize(difference(p3, p1));
  console.log(dot(normalize(v), u));
  const s = sum(p1, scale(u, dot(v, u)));
  const d = distance(p2, s);
  return d < threshold;
};

const isInline = (p0, p1, p2, threshold) => {
  const v = difference(p2, p1);
  const u = normalize(difference(p1, p0));
  const p2l = sum(p1, scale(u, dot(v, u)));
  return distance(p2, p2l) < threshold;
};

const getInlinePoint = (p0, p1, p2) => {
  const v = difference(p2, p1);
  const u = normalize(difference(p1, p0));
  return sum(p1, scale(u, dot(v, u)));
};

const drawSimplifiedStroke = (context, points, color, thickness, threshold) => {
  // Save previous context state
  context.save();

  // Setup parameters
  context.strokeStyle = color;
  context.fillColor = color;
  context.lineWidth = thickness;

  const blah = [];

  let p0, p1, p2, p3;
  // Loop until one after last to ensure every point shifts through p2
  for (let n = 0; n <= points.length; n++) {
    // Set current point
    p3 = points[n];

    // Simplify by ignoring unnecessary inline points
    if (p1 && p2 && p3 && isInlineCenter(p1, p2, p3, threshold)) {
      p2 = p3;
      continue;
    }

    // Draw dot
    if (!p0 && !p1 && p2 && !p3) {
      context.beginPath();
      context.ellipse(p2.x, p2.y, thickness / 2, thickness / 2, 0, 0, Math.PI * 2);
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
      const c = sum(p2, scale(normalize(difference(p1, p3)), distance(p1, p2) / DAMPING));
      
      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      context.stroke();

      context.save();
      context.strokeStyle = CONTROL_COLOR;
      context.lineWidth = RADIUS;

      context.beginPath();
      context.moveTo(c.x, c.y);
      context.lineTo(p2.x, p2.y);
      context.stroke();
      context.restore();
    }

    // Draw quadratic bezier with left bias
    else if (p0 && p1 && p2 && !p3) {
      const c = sum(p1, scale(normalize(difference(p2, p0)), distance(p1, p2) / DAMPING));

      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      context.stroke();

      context.save();
      context.strokeStyle = CONTROL_COLOR;
      context.lineWidth = RADIUS;

      context.beginPath();
      context.moveTo(c.x, c.y);
      context.lineTo(p1.x, p1.y);
      context.stroke();
      context.restore();
    }

    // Draw cubic bezier
    else if (p0 && p1 && p2 && p3) {
      const c0 = sum(p1, scale(normalize(difference(p2, p0)), distance(p1, p2) / DAMPING));
      const c1 = sum(p2, scale(normalize(difference(p1, p3)), distance(p1, p2) / DAMPING));

      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.bezierCurveTo(c0.x, c0.y, c1.x, c1.y, p2.x, p2.y);
      context.stroke();

      context.save();
      context.strokeStyle = CONTROL_COLOR;
      context.lineWidth = RADIUS;

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

    if (p2) {
      blah.push(p2);
    }

    // Update points
    p0 = p1;
    p1 = p2;
    p2 = p3;
  }

  // Restore previous context state
  context.restore();

  drawPoints(blah);
};

const simplify = (points, threshold) => {
  let i = 2;
  while (i < points.length) {
    const p0 = points[i - 2];
    const p1 = points[i - 1];
    const p2 = points[i];
    const v = difference(p2, p1);
    const u = normalize(difference(p1, p0));
    const p2l = sum(p1, scale(u, dot(v, u)));
    const d = distance(p2, p2l);

    if (d < threshold) {
      if (i === points.length - 1) {
        points[i] = p2l;
        i++;
      } else {
        points.splice(i, 1);
      }
    } else {
      i++;
    }
  }
};

const drawStroke = (stroke) => {
  let p0 = null;
  let p1 = null;
  for (let n = 0; n < stroke.length; n++) {
    let p2 = stroke[n];
    let p3 = n + 1 < stroke.length ? stroke[n + 1] : null;

    context.fillStyle = 'black';
    if (p0 === null && p1 === null) {
      // draw ellipse
      context.beginPath();
      context.ellipse(p2.x, p2.y, RADIUS, RADIUS, 0, 0, Math.PI * 2);
      context.fill();
    } else if (p0 === null && p3 === null) {
      // draw line
      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.lineTo(p2.x, p2.y);
      context.stroke();
    } else if (p0 === null && p3 !== null) {
      // draw quadratic bezier
      context.beginPath();
      const c = sum(p2, scale(normalize(difference(p1, p3)), distance(p1, p2) / DAMPING));
      context.moveTo(p1.x, p1.y);
      context.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      context.stroke();
    } else if (p0 !== null && p3 === null) {
      // draw quadratic bezier
      context.beginPath();
      const c = sum(p1, scale(normalize(difference(p2, p0)), distance(p1, p2) / DAMPING));
      context.moveTo(p1.x, p1.y);
      context.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      context.stroke();
    } else if (p0 !== null && p3 !== null) {
      // draw cubic bezier
      const c0 = sum(p1, scale(normalize(difference(p2, p0)), distance(p1, p2) / DAMPING));
      const c1 = sum(p2, scale(normalize(difference(p1, p3)), distance(p1, p2) / DAMPING));
      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.bezierCurveTo(c0.x, c0.y, c1.x, c1.y, p2.x, p2.y);
      context.stroke();
    }
    p0 = p1;
    p1 = p2;
  }
};

const drawPoints = (points) => {
  context.fillStyle = '#1dde64';
  points.forEach((point) => {
    context.beginPath();
    context.ellipse(point.x, point.y, RADIUS, RADIUS, 0, 0, Math.PI * 2);
    context.fill();
  });
};

const update = () => {
  clearCanvas();

  strokes.forEach((stroke) => {
    // simplify(stroke, THRESHOLD);
    // drawStroke(stroke);
    drawSimplifiedStroke(context, stroke, 'black', RADIUS * 2, THRESHOLD);
    // drawPoints(stroke);
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
// canvas.addEventListener('click', event => {
//   stroke.push(getCanvasPoint({x: event.clientX, y: event.clientY}));
// });

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
