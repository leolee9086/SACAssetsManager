export function cubicBezier(x1, y1, x2, y2) {
    return function(t) {
      const cx = 3 * x1;
      const bx = 3 * (x2 - x1) - cx;
      const ax = 1 - cx - bx;
      const cy = 3 * y1;
      const by = 3 * (y2 - y1) - cy;
      const ay = 1 - cy - by;
      
      function sampleCurveX(t) {
        return ((ax * t + bx) * t + cx) * t;
      }
      
      function sampleCurveY(t) {
        return ((ay * t + by) * t + cy) * t;
      }
      
      function solveCurveX(x) {
        let t2 = x;
        for (let i = 0; i < 8; i++) {
          const x2 = sampleCurveX(t2) - x;
          if (Math.abs(x2) < 1e-6) return t2;
          const d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
          if (Math.abs(d2) < 1e-6) break;
          t2 = t2 - x2 / d2;
        }
        return t2;
      }
      
      return sampleCurveY(solveCurveX(t));
    };
  } 
  