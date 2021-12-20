const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

const RADIUS = 10;
const FRAMERATE = 60;
const SEGMENT_SIZE = 20;

let stroke = [];

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

const DAMPING = 2;
const LINEARITY_THRESHOLD = 0.90;

const update = () => {
  clearCanvas();

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
      // align p3 with previous points if nearly in line
      // const w = normalize(difference(p3, p2));
      // const z = normalize(difference(p2, p1));
      // const cosPhi = dot(w, z);

      // if (cosPhi > LINEARITY_THRESHOLD) {
      //   p3 = sum(p2, scale(z, length(difference(p3, p2))));
      // }

      // draw quadratic bezier
      context.beginPath();
      const c = sum(p2, scale(normalize(difference(p1, p3)), distance(p1, p2) / DAMPING));
      context.moveTo(p1.x, p1.y);
      context.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      context.stroke();
    } else if (p0 !== null && p3 === null) {
      // align p2 with previous points if nearly in line
      // const v = normalize(difference(p2, p1));
      // const u = normalize(difference(p1, p0));
      // const cosTheta = dot(v, u);

      // if (cosTheta > LINEARITY_THRESHOLD) {
      //   p2 = sum(p1, scale(u, length(difference(p2, p1))));
      // }

      // draw quadratic bezier
      context.beginPath();
      const c = sum(p1, scale(normalize(difference(p2, p0)), distance(p1, p2) / DAMPING));
      context.moveTo(p1.x, p1.y);
      context.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      context.stroke();
    } else if (p0 !== null && p3 !== null) {
      // align p2 with previous points if nearly in line
      // const v = normalize(difference(p2, p1));
      // const u = normalize(difference(p1, p0));
      // const cosTheta = dot(v, u);

      // if (cosTheta > LINEARITY_THRESHOLD) {
      //   p2 = sum(p1, scale(u, length(difference(p2, p1))));
      // }

      // // align p3 with previous points if nearly in line
      // const w = normalize(difference(p3, p2));
      // const z = normalize(difference(p2, p1));
      // const cosPhi = dot(w, z);

      // if (cosPhi > LINEARITY_THRESHOLD) {
      //   p3 = sum(p2, scale(z, length(difference(p3, p2))));
      // }

      // draw cubic bezier
      const c0 = sum(p1, scale(normalize(difference(p2, p0)), distance(p1, p2) / DAMPING));
      const c1 = sum(p2, scale(normalize(difference(p1, p3)), distance(p1, p2) / DAMPING));
      context.beginPath();
      context.moveTo(p1.x, p1.y);
      context.bezierCurveTo(c0.x, c0.y, c1.x, c1.y, p2.x, p2.y);
      context.stroke();
    }

    // draw current point
    // context.fillStyle = '#32a852';
    // context.beginPath();
    // context.ellipse(p2.x, p2.y, RADIUS * 3, RADIUS * 3, 0, 0, Math.PI * 2);
    // context.fill();

    p0 = p1;
    p1 = p2;
  }
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
    stroke = [];
  }
});
// canvas.addEventListener('click', event => stroke.push(getCanvasPoint({x: event.clientX, y: event.clientY})));

let lastPoint = null;
canvas.addEventListener('pointermove', (event) => {
  if (event.buttons === 1) {
    const currentPoint = getCanvasPoint({ x: event.clientX, y: event.clientY });
    if (lastPoint === null || distance(lastPoint, currentPoint) > SEGMENT_SIZE) {
      lastPoint = currentPoint;
      stroke.push(currentPoint);
    }
  }
});
