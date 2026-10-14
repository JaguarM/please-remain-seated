// First-Person 3D WebGL Cabin Renderer + 2D Pixel-Art Billboard Sprites (PRS.atlas) + HUD & Minimap.
// Combines a 3D perspective cabin & volumetric ceiling-down smoke layer with the classic 16x16 2D pixel art
// from game/art/cabin-sprites.js and game/engine/atlas.js.
(function (global) {
    "use strict";

    const PRS = global.PRS = global.PRS || {};
    const { clamp, clamp01, lerp } = PRS.util;
    const CAT = PRS.catalog;
    const CABIN = CAT.CABIN;

    let glCtx = null;
    let glCanvas = null;
    let prog = null;
    let vbo = null;
    let loc = {};

    const FLOATS_PER_VERT = 10;
    let opaqueData = new Float32Array(100000 * FLOATS_PER_VERT);
    let opaqueVerts = 0;
    let transData = new Float32Array(50000 * FLOATS_PER_VERT);
    let transVerts = 0;
    let currentTarget = "opaque";

    const cam = {
        ex: 6.0, ey: 0.0, ez: 1.58,
        yaw: 0.0, pitch: 0.0, roll: 0.0,
        rx: 0, ry: 1, rz: 0,
        ux: 0, uy: 0, uz: 1,
        fx: 1, fy: 0, fz: 0,
        fovY: 68 * Math.PI / 180,
        tanHalfFov: Math.tan(34 * Math.PI / 180),
        aspect: 1.6,
        near: 0.08,
        far: 28.0,
        width: 1280,
        height: 720
    };

    function resetCamera(startX) {
        if (PRS.atlas && PRS.atlas.boot) PRS.atlas.boot();
        cam.ex = startX || 6.0;
        cam.ey = 0.0;
        cam.ez = 1.58;
        cam.yaw = 0.0;
        cam.pitch = 0.0;
        cam.roll = 0.0;
    }

    // ----------------------------------------------------------------- WebGL Initialization ---
    const VS_SRC = [
        "attribute vec3 aPos;",
        "attribute vec3 aNorm;",
        "attribute vec4 aCol;",
        "uniform vec3 uEye;",
        "uniform vec3 uRight;",
        "uniform vec3 uUp;",
        "uniform vec3 uFwd;",
        "uniform vec4 uProj;",
        "varying vec3 vWorldPos;",
        "varying vec3 vNorm;",
        "varying vec4 vCol;",
        "varying float vDepth;",
        "void main() {",
        "  vec3 rel = aPos - uEye;",
        "  float cx = dot(rel, uRight);",
        "  float cy = dot(rel, uUp);",
        "  float cz = dot(rel, uFwd);",
        "  vWorldPos = aPos;",
        "  vNorm = aNorm;",
        "  vCol = aCol;",
        "  vDepth = cz;",
        "  gl_Position = vec4(cx * uProj.x, cy * uProj.y, cz * uProj.z + uProj.w, cz);",
        "}"
    ].join("\n");

    const FS_SRC = [
        "precision mediump float;",
        "varying vec3 vWorldPos;",
        "varying vec3 vNorm;",
        "varying vec4 vCol;",
        "varying float vDepth;",
        "uniform vec3 uAmbientTop;",
        "uniform vec3 uAmbientBot;",
        "uniform vec4 uLight0Pos;",
        "uniform vec3 uLight0Col;",
        "uniform vec4 uLight1Pos;",
        "uniform vec3 uLight1Col;",
        "uniform vec4 uFogCol;",
        "uniform float uUnlit;",
        "void main() {",
        "  if (vCol.a <= 0.01) discard;",
        "  vec3 col = vCol.rgb;",
        "  if (uUnlit < 0.5) {",
        "    vec3 n = normalize(vNorm);",
        "    float hemi = n.z * 0.5 + 0.5;",
        "    vec3 light = mix(uAmbientBot, uAmbientTop, hemi);",
        "    vec3 stripDir = normalize(vec3(0.0, -vWorldPos.y * 0.6, 2.35 - vWorldPos.z));",
        "    float stripDiff = max(0.0, dot(n, stripDir)) * 0.38;",
        "    light += vec3(0.92, 0.95, 1.0) * stripDiff;",
        "    if (uLight0Pos.w > 0.1) {",
        "      vec3 d0 = uLight0Pos.xyz - vWorldPos;",
        "      float dist0 = length(d0);",
        "      float att0 = clamp(1.0 - dist0 / uLight0Pos.w, 0.0, 1.0);",
        "      float diff0 = max(0.15, dot(n, d0 / max(0.001, dist0)));",
        "      light += uLight0Col * (att0 * att0 * diff0);",
        "    }",
        "    if (uLight1Pos.w > 0.1) {",
        "      vec3 d1 = uLight1Pos.xyz - vWorldPos;",
        "      float dist1 = length(d1);",
        "      float att1 = clamp(1.0 - dist1 / uLight1Pos.w, 0.0, 1.0);",
        "      float diff1 = max(0.15, dot(n, d1 / max(0.001, dist1)));",
        "      light += uLight1Col * (att1 * att1 * diff1);",
        "    }",
        "    col *= light;",
        "  }",
        "  float fogF = clamp(1.0 - exp(-max(0.0, vDepth - 0.6) * uFogCol.a), 0.0, 0.92);",
        "  col = mix(col, uFogCol.rgb, fogF);",
        "  gl_FragColor = vec4(col, vCol.a);",
        "}"
    ].join("\n");

    function initGL(canvas) {
        if (glCtx && glCanvas === canvas) return glCtx;
        glCanvas = canvas;
        const gl = canvas.getContext("webgl", { alpha: false, antialias: true, depth: true });
        if (!gl) return null;
        glCtx = gl;

        const vs = compileShader(gl, gl.VERTEX_SHADER, VS_SRC);
        const fs = compileShader(gl, gl.FRAGMENT_SHADER, FS_SRC);
        prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        gl.useProgram(prog);

        vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

        loc = {
            aPos: gl.getAttribLocation(prog, "aPos"),
            aNorm: gl.getAttribLocation(prog, "aNorm"),
            aCol: gl.getAttribLocation(prog, "aCol"),
            uEye: gl.getUniformLocation(prog, "uEye"),
            uRight: gl.getUniformLocation(prog, "uRight"),
            uUp: gl.getUniformLocation(prog, "uUp"),
            uFwd: gl.getUniformLocation(prog, "uFwd"),
            uProj: gl.getUniformLocation(prog, "uProj"),
            uAmbientTop: gl.getUniformLocation(prog, "uAmbientTop"),
            uAmbientBot: gl.getUniformLocation(prog, "uAmbientBot"),
            uLight0Pos: gl.getUniformLocation(prog, "uLight0Pos"),
            uLight0Col: gl.getUniformLocation(prog, "uLight0Col"),
            uLight1Pos: gl.getUniformLocation(prog, "uLight1Pos"),
            uLight1Col: gl.getUniformLocation(prog, "uLight1Col"),
            uFogCol: gl.getUniformLocation(prog, "uFogCol"),
            uUnlit: gl.getUniformLocation(prog, "uUnlit")
        };

        const stride = FLOATS_PER_VERT * 4;
        gl.enableVertexAttribArray(loc.aPos);
        gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(loc.aNorm);
        gl.vertexAttribPointer(loc.aNorm, 3, gl.FLOAT, false, stride, 12);
        gl.enableVertexAttribArray(loc.aCol);
        gl.vertexAttribPointer(loc.aCol, 4, gl.FLOAT, false, stride, 24);

        return gl;
    }

    function compileShader(gl, type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
    }

    // -------------------------------------------------------------- Low-Level Mesh Builders ---
    function setBatch(target) {
        currentTarget = target;
    }

    function pushVert(x, y, z, nx, ny, nz, r, g, b, a) {
        let arr, idx;
        if (currentTarget === "opaque") {
            if (opaqueVerts + 1 >= opaqueData.length / FLOATS_PER_VERT) return;
            arr = opaqueData;
            idx = opaqueVerts * FLOATS_PER_VERT;
            opaqueVerts++;
        } else {
            if (transVerts + 1 >= transData.length / FLOATS_PER_VERT) return;
            arr = transData;
            idx = transVerts * FLOATS_PER_VERT;
            transVerts++;
        }
        arr[idx] = x;
        arr[idx + 1] = y;
        arr[idx + 2] = z;
        arr[idx + 3] = nx;
        arr[idx + 4] = ny;
        arr[idx + 5] = nz;
        arr[idx + 6] = r;
        arr[idx + 7] = g;
        arr[idx + 8] = b;
        arr[idx + 9] = a;
    }

    function pushQuad(
        x0, y0, z0,
        x1, y1, z1,
        x2, y2, z2,
        x3, y3, z3,
        nx, ny, nz,
        r, g, b, a
    ) {
        pushVert(x0, y0, z0, nx, ny, nz, r, g, b, a);
        pushVert(x1, y1, z1, nx, ny, nz, r, g, b, a);
        pushVert(x2, y2, z2, nx, ny, nz, r, g, b, a);

        pushVert(x0, y0, z0, nx, ny, nz, r, g, b, a);
        pushVert(x2, y2, z2, nx, ny, nz, r, g, b, a);
        pushVert(x3, y3, z3, nx, ny, nz, r, g, b, a);
    }

    function addBox(cx, cy, cz, hx, hy, hz, r, g, b, a) {
        if (a === undefined) a = 1.0;
        const x0 = cx - hx, x1 = cx + hx;
        const y0 = cy - hy, y1 = cy + hy;
        const z0 = cz - hz, z1 = cz + hz;

        pushQuad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, 0, 0, 1, r, g, b, a);
        pushQuad(x0, y1, z0, x1, y1, z0, x1, y0, z0, x0, y0, z0, 0, 0, -1, r * 0.75, g * 0.75, b * 0.75, a);
        pushQuad(x1, y0, z0, x1, y1, z0, x1, y1, z1, x1, y0, z1, 1, 0, 0, r * 0.92, g * 0.92, b * 0.92, a);
        pushQuad(x0, y1, z0, x0, y0, z0, x0, y0, z1, x0, y1, z1, -1, 0, 0, r * 0.92, g * 0.92, b * 0.92, a);
        pushQuad(x1, y1, z0, x0, y1, z0, x0, y1, z1, x1, y1, z1, 0, 1, 0, r * 0.86, g * 0.86, b * 0.86, a);
        pushQuad(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, 0, -1, 0, r * 0.86, g * 0.86, b * 0.86, a);
    }

    // -------------------------------------------------------------- Camera & 3D Projection ---
    function updateCamera(S, w, h, nowMs, opts) {
        opts = opts || {};
        const P = S.player;
        cam.width = w;
        cam.height = h;
        cam.aspect = w / Math.max(1, h);

        if (opts.backdropMode) {
            const t = (nowMs || 0) * 0.00035;
            cam.ex = 5.5 + Math.sin(t) * 2.8;
            cam.ey = Math.cos(t * 1.3) * 0.22;
            cam.ez = 1.48 + Math.sin(t * 2.0) * 0.12;
            cam.yaw = Math.sin(t * 0.8) * 0.22;
            cam.pitch = -0.05 + Math.cos(t * 1.1) * 0.06;
            cam.roll = (S.turb.rollAngle || 0) * Math.PI / 180;
        } else {
            cam.ex = P.x;
            cam.ey = P.y;
            cam.ez = P.eyeH;
            cam.yaw = P.yaw;
            cam.pitch = P.pitch + (S.turb.tiltAngle || 0) * 0.008;
            cam.roll = (S.turb.rollAngle || 0) * Math.PI / 180 + (P.stunTimer > 0 ? Math.sin((nowMs || 0) * 0.03) * 0.14 : 0);
        }

        const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
        const cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);

        cam.fx = cosP * cosY;
        cam.fy = cosP * sinY;
        cam.fz = sinP;

        const r0x = -sinY, r0y = cosY, r0z = 0;
        const u0x = -sinP * cosY, u0y = -sinP * sinY, u0z = cosP;

        const cosR = Math.cos(cam.roll), sinR = Math.sin(cam.roll);
        cam.rx = r0x * cosR + u0x * sinR;
        cam.ry = r0y * cosR + u0y * sinR;
        cam.rz = r0z * cosR + u0z * sinR;

        cam.ux = -r0x * sinR + u0x * cosR;
        cam.uy = -r0y * sinR + u0y * cosR;
        cam.uz = -r0z * sinR + u0z * cosR;
    }

    function project3D(wx, wy, wz) {
        const dx = wx - cam.ex;
        const dy = wy - cam.ey;
        const dz = wz - cam.ez;

        const cx = dx * cam.rx + dy * cam.ry + dz * cam.rz;
        const cy = dx * cam.ux + dy * cam.uy + dz * cam.uz;
        const cz = dx * cam.fx + dy * cam.fy + dz * cam.fz;

        if (cz <= 0.12) {
            return { x: -9999, y: -9999, z: cz, visible: false };
        }

        const ndcX = cx / (cz * cam.tanHalfFov * cam.aspect);
        const ndcY = cy / (cz * cam.tanHalfFov);

        return {
            x: (ndcX * 0.5 + 0.5) * cam.width,
            y: (0.5 - ndcY * 0.5) * cam.height,
            z: cz,
            visible: ndcX >= -1.25 && ndcX <= 1.25 && ndcY >= -1.25 && ndcY <= 1.25
        };
    }

    // -------------------------------------------------------------- 3D Cabin Architecture ---
    function buildSceneGeometry(S, nowMs) {
        opaqueVerts = 0;
        transVerts = 0;

        setBatch("opaque");
        buildCabinShell3D(S, nowMs);
        buildSeatsAndBins3D(S, nowMs);
        buildSpecialStations3D(S, nowMs);
        buildCart3D(S);

        setBatch("trans");
        buildSmokeCeiling3D(S, nowMs);
        buildFx3D(S);
    }

    function buildCabinShell3D(S, nowMs) {
        const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.008);

        for (let i = 0; i < CABIN.STATIONS; i++) {
            const cx = i;
            const flm = S.fire[i] || 0;
            const wet = S.wet[i] || 0;
            const isExit = (i === CABIN.FWD_EXIT_X || i === CABIN.AFT_EXIT_X);

            // Floor Carpet matching cabin-sprites.js palette (#2f3746 / #3b4454)
            let fr = 0.18, fg = 0.22, fb = 0.27;
            if (isExit) {
                fr = 0.10; fg = 0.36; fb = 0.24;
            } else if (wet > 8) {
                const wf = clamp01(wet / 80);
                fr = lerp(fr, 0.15, wf);
                fg = lerp(fg, 0.38, wf);
                fb = lerp(fb, 0.58, wf);
            }
            if (flm > 10) {
                const cf = clamp01(flm / 85);
                fr = lerp(fr, 0.22, cf);
                fg = lerp(fg, 0.12, cf);
                fb = lerp(fb, 0.08, cf);
            }
            if (i % 2 === 0) { fr *= 1.06; fg *= 1.06; fb *= 1.06; }

            pushQuad(
                cx - 0.5, -1.35, 0.0,
                cx + 0.5, -1.35, 0.0,
                cx + 0.5,  1.35, 0.0,
                cx - 0.5,  1.35, 0.0,
                0, 0, 1, fr, fg, fb, 1.0
            );

            // Center Aisle runner + Glowing Photoluminescent Aisle Strips
            pushQuad(
                cx - 0.5, -0.37, 0.004,
                cx + 0.5, -0.37, 0.004,
                cx + 0.5,  0.37, 0.004,
                cx - 0.5,  0.37, 0.004,
                0, 0, 1, 0.23, 0.27, 0.33, 1.0
            );

            const stripR = S.crewAlerted ? 0.25 : 0.20;
            const stripG = S.crewAlerted ? (0.85 + 0.15 * pulse) : 0.72;
            const stripB = S.crewAlerted ? 0.45 : 0.88;
            addBox(cx, -0.38, 0.008, 0.48, 0.022, 0.006, stripR, stripG, stripB, 1.0);
            addBox(cx,  0.38, 0.008, 0.48, 0.022, 0.006, stripR, stripG, stripB, 1.0);

            // Sidewalls (#767e8d / #5b6270 from cabin-sprites.js)
            const wr = 0.46, wg = 0.49, wb = 0.55;
            pushQuad(
                cx - 0.5, -1.35, 0.0,
                cx + 0.5, -1.35, 0.0,
                cx + 0.5, -1.35, 1.78,
                cx - 0.5, -1.35, 1.78,
                0, 1, 0, wr, wg, wb, 1.0
            );
            pushQuad(
                cx + 0.5, 1.35, 0.0,
                cx - 0.5, 1.35, 0.0,
                cx - 0.5, 1.35, 1.78,
                cx + 0.5, 1.35, 1.78,
                0, -1, 0, wr, wg, wb, 1.0
            );

            // Fuselage rib frames
            addBox(cx - 0.48, -1.32, 0.95, 0.03, 0.04, 0.95, 0.35, 0.38, 0.44, 1.0);
            addBox(cx - 0.48,  1.32, 0.95, 0.03, 0.04, 0.95, 0.35, 0.38, 0.44, 1.0);

            // Cabin Windows (#9fd4f2 sky from cabin-sprites.js)
            if (i >= 3 && i <= 14) {
                addBox(cx, -1.33, 1.24, 0.16, 0.02, 0.21, 0.23, 0.26, 0.31, 1.0);
                addBox(cx, -1.32, 1.24, 0.12, 0.022, 0.16, 0.62, 0.83, 0.95, 1.0);
                addBox(cx,  1.33, 1.24, 0.16, 0.02, 0.21, 0.23, 0.26, 0.31, 1.0);
                addBox(cx,  1.32, 1.24, 0.12, 0.022, 0.16, 0.62, 0.83, 0.95, 1.0);
            }

            // Ceiling Panel (z = 2.25)
            pushQuad(
                cx - 0.5,  1.35, 2.25,
                cx + 0.5,  1.35, 2.25,
                cx + 0.5, -1.35, 2.25,
                cx - 0.5, -1.35, 2.25,
                0, 0, -1, 0.78, 0.82, 0.88, 1.0
            );
            const lr = S.crewAlerted ? 0.98 : 0.90;
            const lg = S.crewAlerted ? 0.55 : 0.95;
            const lb = S.crewAlerted ? 0.35 : 1.00;
            addBox(cx, 0.0, 2.23, 0.46, 0.14, 0.015, lr, lg, lb, 1.0);

            if (i % 3 === 1) {
                const sr = isExit ? 0.15 : (S.crewAlerted ? 0.95 : 0.98);
                const sg = isExit ? 0.92 : (S.crewAlerted ? 0.25 : 0.78);
                const sb = isExit ? 0.45 : 0.18;
                addBox(cx, 0.0, 2.13, 0.04, 0.28, 0.06, sr, sg, sb, 1.0);
            }
        }
    }

    function buildSeatsAndBins3D(S) {
        for (let i = 2; i <= 14; i++) {
            const cx = i;
            const isFireBin = (i === CABIN.ORIGIN_X);

            // Left & Right Overhead Luggage Bins (#565d6b / #7d8595 from cabin-sprites.js)
            for (const side of [-1, 1]) {
                const by = side * 0.96;
                const isLocker9C = (isFireBin && side === -1);

                let br = 0.49, bg = 0.52, bb = 0.58;
                if (isLocker9C && S.core.inBin && !S.core.inSink) {
                    const heatF = clamp01(S.core.heat / 100);
                    br = lerp(0.55, 0.95, heatF);
                    bg = lerp(0.48, 0.32, heatF);
                    bb = lerp(0.45, 0.18, heatF);
                }

                if (isLocker9C && S.core.binOpen) {
                    addBox(cx, by, 1.74, 0.46, 0.32, 0.025, 0.17, 0.19, 0.23, 1.0);
                    addBox(cx, by, 2.14, 0.46, 0.32, 0.025, br, bg, bb, 1.0);
                    addBox(cx, side * 1.26, 1.94, 0.46, 0.03, 0.20, 0.08, 0.09, 0.11, 1.0);
                    addBox(cx, side * 0.62, 2.12, 0.45, 0.14, 0.025, 0.88, 0.42, 0.18, 1.0);
                } else {
                    addBox(cx, by, 1.94, 0.46, 0.34, 0.19, br, bg, bb, 1.0);
                    addBox(cx, side * 0.61, 1.84, 0.12, 0.02, 0.03, 0.24, 0.26, 0.30, 1.0);
                }
            }

            // Left & Right Seat Banks (#42557d cushion, #4b5f8e back, #aab3c0 headrest from cabin-sprites.js)
            if (i >= 3 && i <= 14) {
                const flm = S.fire[i] || 0;
                const scorched = flm > 18;
                const sr = scorched ? 0.27 : 0.26;
                const sg = scorched ? 0.24 : 0.33;
                const sb = scorched ? 0.20 : 0.49;

                for (const side of [-1, 1]) {
                    const sy = side * 0.84;
                    addBox(cx, sy, 0.42, 0.26, 0.38, 0.06, sr, sg, sb, 1.0);
                    addBox(cx, side * 0.54, 0.19, 0.04, 0.04, 0.19, 0.15, 0.18, 0.24, 1.0);
                    addBox(cx, side * 1.12, 0.19, 0.04, 0.04, 0.19, 0.15, 0.18, 0.24, 1.0);
                    addBox(cx + 0.17, sy, 0.78, 0.06, 0.37, 0.32, sr * 1.12, sg * 1.12, sb * 1.12, 1.0);
                    addBox(cx + 0.16, sy, 1.04, 0.068, 0.34, 0.08, 0.67, 0.70, 0.75, 1.0);
                    addBox(cx + 0.02, side * 0.45, 0.58, 0.22, 0.035, 0.03, 0.52, 0.56, 0.63, 1.0);
                }
            }
        }
    }

    function buildSpecialStations3D(S, nowMs) {
        const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.01);

        // Cockpit Bulkhead & Door (x = -0.35)
        addBox(-0.42, 0.0, 1.12, 0.08, 1.35, 1.12, 0.27, 0.30, 0.34, 1.0);
        const doorR = S.clock.declared ? 0.18 : 0.37;
        const doorG = S.clock.declared ? 0.52 : 0.40;
        const doorB = S.clock.declared ? 0.35 : 0.45;
        addBox(-0.34, 0.0, 0.98, 0.04, 0.44, 0.96, doorR, doorG, doorB, 1.0);
        addBox(-0.29, 0.0, 1.12, 0.03, 0.14, 0.08, 0.76, 0.23, 0.18, 1.0);

        // Exit Doors (x = 1.0 & x = 15.0)
        for (const exX of [CABIN.FWD_EXIT_X, CABIN.AFT_EXIT_X]) {
            for (const side of [-1, 1]) {
                addBox(exX, side * 1.29, 0.96, 0.38, 0.05, 0.92, 0.55, 0.58, 0.63, 1.0);
                addBox(exX, side * 1.23, 1.05, 0.18, 0.04, 0.06, 0.91, 0.77, 0.23, 1.0);
                addBox(exX, side * 1.18, 1.98, 0.22, 0.06, 0.07, 0.18, 0.95, 0.45, 1.0);
            }
        }

        // Forward & Aft Galley Counters
        addBox(1.85, -0.92, 0.52, 0.32, 0.38, 0.52, 0.52, 0.55, 0.60, 1.0);
        addBox(1.85, -0.75, 1.12, 0.05, 0.08, 0.10, 0.25, 0.75, 0.95, 1.0);
        addBox(14.75, 0.92, 0.52, 0.30, 0.38, 0.52, 0.52, 0.55, 0.60, 1.0);
        addBox(14.75, 0.72, 1.38, 0.06, 0.06, 0.14, S.paUsed ? 0.3 : 0.98, S.paUsed ? 0.85 : 0.78, 0.20, 1.0);

        // Aft Lavatory Sink Counter & Ceiling Smoke Detector (x = 16.0)
        addBox(16.55, 0.0, 1.12, 0.08, 1.35, 1.12, 0.27, 0.30, 0.34, 1.0);
        addBox(16.05, -0.72, 0.42, 0.38, 0.46, 0.42, 0.58, 0.61, 0.67, 1.0);
        addBox(16.05, -0.68, 0.86, 0.28, 0.32, 0.04, 0.14, 0.72, 0.96, 1.0);
        addBox(16.22, -0.68, 0.98, 0.04, 0.04, 0.10, 0.88, 0.92, 0.96, 1.0);
        addBox(16.44, -0.68, 1.42, 0.02, 0.36, 0.38, 0.52, 0.72, 0.88, 1.0);

        addBox(15.95, 0.0, 2.21, 0.18, 0.18, 0.03, 0.92, 0.94, 0.96, 1.0);
        const detR = S.detectorTriggered ? 1.0 : (0.45 + 0.55 * pulse);
        const detG = S.detectorTriggered ? (0.15 * pulse) : 0.15;
        addBox(15.95, 0.0, 2.16, 0.08, 0.08, 0.03, detR, detG, 0.15, 1.0);
    }

    function buildCart3D(S) {
        const cx = S.cart.x;
        const cy = S.cart.y || 0.0;
        addBox(cx, cy, 0.44, 0.30, 0.22, 0.36, 0.56, 0.59, 0.64, 1.0);
        addBox(cx - 0.32, cy, 0.82, 0.03, 0.20, 0.03, 0.72, 0.75, 0.80, 1.0);
        addBox(cx + 0.32, cy, 0.82, 0.03, 0.20, 0.03, 0.72, 0.75, 0.80, 1.0);
    }

    function buildSmokeCeiling3D(S, nowMs) {
        const t = nowMs * 0.006;
        for (let i = 1; i < CABIN.STATIONS - 1; i++) {
            const smk = S.smoke[i];
            if (smk <= 4.0) continue;

            const zBot = PRS.world.smokeCeilingHeightAt(S, i);
            const zTop = 2.23;
            if (zTop <= zBot + 0.04) continue;

            const zMid = (zTop + zBot) * 0.5;
            const zHalf = (zTop - zBot) * 0.5;
            const alpha = clamp(smk / 135, 0.14, 0.68);
            const hotGlow = clamp01(S.fire[i] / 90);

            const sr = lerp(0.24, 0.42, hotGlow);
            const sg = lerp(0.25, 0.24, hotGlow);
            const sb = lerp(0.28, 0.20, hotGlow);

            addBox(i, 0.0, zMid, 0.50, 1.28, zHalf, sr, sg, sb, alpha);

            const billowZ = zBot + Math.sin(t + i * 0.9) * 0.04;
            addBox(i, -0.35, billowZ, 0.46, 0.52, 0.09, sr * 1.15, sg * 1.15, sb * 1.15, alpha * 0.85);
            addBox(i,  0.35, billowZ, 0.46, 0.52, 0.09, sr * 1.15, sg * 1.15, sb * 1.15, alpha * 0.85);
        }
    }

    function buildFx3D(S) {
        for (const f of S.fx) {
            const p = clamp01(f.t / Math.max(0.01, f.dur));
            const alpha = (1.0 - p) * 0.85;
            const fx = f.x !== undefined ? f.x : S.player.x;
            const fy = f.y !== undefined ? f.y : S.player.y;
            const fz = f.z !== undefined ? f.z : 1.1;

            if (f.kind === "splash" || f.kind === "halon" || f.kind === "spray") {
                const col = f.kind === "halon" ? [0.85, 0.96, 1.0] : [0.22, 0.78, 1.0];
                const rad = 0.15 + p * 0.55;
                addBox(fx, fy, fz, rad, rad, rad * 0.6, col[0], col[1], col[2], alpha);
            } else if (f.kind === "gust" || f.kind === "wind" || f.kind === "horn") {
                const col = f.kind === "horn" ? [1.0, 0.84, 0.18] : [0.55, 0.90, 1.0];
                const dist = 0.4 + p * 2.2;
                const dir = f.dir || Math.cos(S.player.yaw) || 1;
                addBox(fx + dir * dist, fy, fz, 0.12, 0.45 + p * 0.4, 0.35 + p * 0.3, col[0], col[1], col[2], alpha * 0.7);
            } else if (f.kind === "flash") {
                addBox(fx, fy, fz, 0.6, 0.6, 0.6, 1.0, 1.0, 0.95, alpha * 0.9);
            } else if (f.kind === "sparks") {
                addBox(fx, fy, fz, 0.25 + p * 0.4, 0.25 + p * 0.4, 0.25 + p * 0.4, 1.0, 0.65, 0.15, alpha);
            }
        }
    }

    // ------------------------------------------------------------- Main 3D WebGL Render Pass ---
    function drawScene3D(glCanvasEl, overlayCanvasEl, S, nowMs, opts) {
        opts = opts || {};
        if (!glCanvasEl || !S) return;
        if (PRS.atlas && PRS.atlas.boot && PRS.atlas.stats().sprites === 0) {
            PRS.atlas.boot();
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = glCanvasEl.clientWidth || 960;
        const h = glCanvasEl.clientHeight || 540;
        if (glCanvasEl.width !== Math.round(w * dpr) || glCanvasEl.height !== Math.round(h * dpr)) {
            glCanvasEl.width = Math.round(w * dpr);
            glCanvasEl.height = Math.round(h * dpr);
        }

        updateCamera(S, w, h, nowMs, opts);
        buildSceneGeometry(S, nowMs);

        const gl = initGL(glCanvasEl);
        if (!gl) return;

        gl.viewport(0, 0, glCanvasEl.width, glCanvasEl.height);
        gl.useProgram(prog);

        const stIdx = clamp(Math.round(cam.ex), 0, CABIN.STATIONS - 1);
        const localSmoke = S.smoke[stIdx] || 0;
        const smokeBotZ = PRS.world.smokeCeilingHeightAt(S, stIdx);
        const headInSmoke = (!opts.backdropMode && cam.ez > smokeBotZ + 0.03 && localSmoke > 15);

        const fogDensity = headInSmoke
            ? clamp(0.08 + (localSmoke / 100) * 0.22, 0.08, 0.28)
            : clamp(0.025 + (localSmoke / 100) * 0.06, 0.025, 0.09);

        const fogR = headInSmoke ? 0.18 : 0.07;
        const fogG = headInSmoke ? 0.16 : 0.10;
        const fogB = headInSmoke ? 0.16 : 0.16;

        gl.clearColor(fogR, fogG, fogB, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const near = cam.near, far = cam.far;
        gl.uniform3f(loc.uEye, cam.ex, cam.ey, cam.ez);
        gl.uniform3f(loc.uRight, cam.rx, cam.ry, cam.rz);
        gl.uniform3f(loc.uUp, cam.ux, cam.uy, cam.uz);
        gl.uniform3f(loc.uFwd, cam.fx, cam.fy, cam.fz);
        gl.uniform4f(
            loc.uProj,
            1.0 / (cam.tanHalfFov * cam.aspect),
            1.0 / cam.tanHalfFov,
            (far + near) / (far - near),
            (-2.0 * far * near) / (far - near)
        );

        const emerg = S.crewAlerted || S.detectorTriggered;
        gl.uniform3f(loc.uAmbientTop, emerg ? 0.72 : 0.68, emerg ? 0.58 : 0.72, emerg ? 0.62 : 0.80);
        gl.uniform3f(loc.uAmbientBot, 0.24, 0.27, 0.35);

        const flicker = 0.85 + 0.15 * Math.sin(nowMs * 0.023);
        if (!S.core.inSink) {
            gl.uniform4f(loc.uLight0Pos, S.core.x, S.core.y, S.core.z, 6.5);
            if (S.core.stage2Blue) {
                gl.uniform3f(loc.uLight0Col, 0.25 * flicker, 0.82 * flicker, 1.35 * flicker);
            } else {
                gl.uniform3f(loc.uLight0Col, 1.15 * flicker, 0.48 * flicker, 0.14 * flicker);
            }
        } else {
            gl.uniform4f(loc.uLight0Pos, 16.0, -0.68, 1.1, 3.5);
            gl.uniform3f(loc.uLight0Col, 0.15, 0.65, 0.85);
        }

        const alarmPulse = 0.5 + 0.5 * Math.sin(nowMs * 0.015);
        if (S.detectorTriggered) {
            gl.uniform4f(loc.uLight1Pos, 15.8, 0.0, 2.1, 7.0);
            gl.uniform3f(loc.uLight1Col, 1.1 * alarmPulse, 0.12, 0.15);
        } else {
            const nearExitX = cam.ex < 8.0 ? CABIN.FWD_EXIT_X : CABIN.AFT_EXIT_X;
            gl.uniform4f(loc.uLight1Pos, nearExitX, 0.0, 1.9, 4.5);
            gl.uniform3f(loc.uLight1Col, 0.12, 0.55, 0.32);
        }

        gl.uniform4f(loc.uFogCol, fogR, fogG, fogB, fogDensity);

        // 1. Opaque 3D Cabin Pass
        gl.enable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.uniform1f(loc.uUnlit, 0.0);

        if (opaqueVerts > 0) {
            gl.bufferData(gl.ARRAY_BUFFER, opaqueData.subarray(0, opaqueVerts * FLOATS_PER_VERT), gl.DYNAMIC_DRAW);
            gl.drawArrays(gl.TRIANGLES, 0, opaqueVerts);
        }

        // 2. Translucent 3D Smoke Layer & FX Pass
        if (transVerts > 0) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.depthMask(false);
            gl.uniform1f(loc.uUnlit, 1.0);
            gl.bufferData(gl.ARRAY_BUFFER, transData.subarray(0, transVerts * FLOATS_PER_VERT), gl.DYNAMIC_DRAW);
            gl.drawArrays(gl.TRIANGLES, 0, transVerts);
            gl.depthMask(true);
            gl.disable(gl.BLEND);
        }

        // 3. 2D Pixel-Art Sprites in 3D Space + First-Person Pixel-Art Hands + HUD Overlay
        if (overlayCanvasEl) {
            drawOverlay2D(overlayCanvasEl, S, nowMs, headInSmoke, opts);
        }
    }

    // ----------------------------------------- 2D Pixel-Art Billboards in 3D Space + Overlay ---
    function drawOverlay2D(canvas, S, nowMs, headInSmoke, opts) {
        opts = opts || {};
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth || 960;
        const h = canvas.clientHeight || 540;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        }
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);

        // 1. Depth-Sorted 2D Pixel-Art Billboard Sprites projected into the 3D Cabin!
        draw2DPixelSpritesIn3D(ctx, S, w, h, nowMs);

        if (opts.backdropMode) {
            ctx.restore();
            return;
        }

        const P = S.player;

        // 2. First-Person 2D Pixel-Art Hands & Held Item in Lower Foreground!
        drawFirstPersonPixelHands(ctx, S, w, h, nowMs);

        // 3. Smoke Hood Visor / Smoke Choking Vignettes
        if (PRS.world.hasPassive(S, "hood")) {
            // Subtle PBE Smoke Hood visor frame
            ctx.strokeStyle = "rgba(216, 134, 44, 0.35)";
            ctx.lineWidth = 10;
            ctx.strokeRect(4, 4, w - 8, h - 8);
        }

        if (headInSmoke) {
            const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.18, w * 0.5, h * 0.5, h * 0.72);
            grad.addColorStop(0, "rgba(15, 23, 42, 0)");
            grad.addColorStop(1, "rgba(15, 23, 42, 0.78)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            drawPill2D(ctx, w * 0.5, h * 0.15, "⬇️ HEAD IN CEILING SMOKE! Hold [C / Ctrl] to Crouch into Clean Air!", "#0f172a", "#38bdf8", "#f8fafc", 13);
        } else if (P.crouching) {
            drawPill2D(ctx, w * 0.5, h - 24, "⬇️ CROUCHING UNDER SMOKE LAYER (Clean Air)", "rgba(15, 23, 42, 0.82)", "#4ade80", "#86efac", 11.5);
        }

        if (P.burns > 15 || (P.holdingCase && !PRS.world.hasPassive(S, "gloves"))) {
            const bAlpha = clamp01(P.burns / 120 + (P.holdingCase ? 0.22 : 0));
            ctx.strokeStyle = "rgba(244, 63, 94, " + (bAlpha * 0.65) + ")";
            ctx.lineWidth = 14;
            ctx.strokeRect(0, 0, w, h);
        }

        // 4. 3D Floating Waypoints, Entity Labels & Speech Bubbles
        draw3DWaypoints(ctx, S, nowMs);
        draw3DEntityLabels(ctx, S);

        // 5. Center Crosshair & Contextual Action Prompts
        const prompts = PRS.world.getPrompts(S);
        drawCrosshairAndPrompts(ctx, w, h, S, prompts);

        ctx.restore();
    }

    function draw2DPixelSpritesIn3D(ctx, S, w, h, nowMs) {
        if (!PRS.atlas) return;
        const sprites = [];
        const frameAlt = Math.floor(nowMs / 180) % 2 === 1;
        const focalPx = (h * 0.5) / cam.tanHalfFov;

        function queueSprite(wx, wy, wz, worldSizeMeters, name, override, alpha, extraOverlay) {
            const proj = project3D(wx, wy, wz);
            if (!proj.visible || proj.z <= 0.18 || proj.z > 22) return;
            const sizePx = clamp((worldSizeMeters / proj.z) * focalPx, 10, h * 0.85);
            sprites.push({
                x: proj.x,
                y: proj.y,
                z: proj.z,
                size: sizePx,
                name,
                override: override || null,
                alpha: alpha !== undefined ? alpha : 1.0,
                extra: extraOverlay || null
            });
        }

        // 1. Passengers (2D Pixel Art from cabin-sprites.js: pax, pax_afraid, pax_asleep, pax_down, child, pet_carrier)
        for (let i = 0; i < S.pax.length; i++) {
            const p = S.pax[i];
            if (p.state === "carried") continue;

            const isChild = (p.role === "child");
            const isPet = (p.role === "pet");
            let sprName = "pax";
            if (isPet) {
                sprName = "pet_carrier";
            } else if (p.state === "dead") {
                sprName = isChild ? "child_gone" : "pax_gone";
            } else if (p.state === "down") {
                sprName = "pax_down";
            } else if (p.state === "asleep" || p.headphonesOn) {
                sprName = isChild ? "child_asleep" : "pax_asleep";
            } else if (p.state === "safe" || p.helper) {
                sprName = isChild ? "child_relieved" : "pax_relieved";
            } else if (p.panic > 55) {
                sprName = isChild ? "child_afraid" : "pax_afraid";
            } else if (p.panic > 25) {
                sprName = isChild ? "child_worried" : "pax_worried";
            } else if (isChild) {
                sprName = "child";
            }

            const walkBob = (p.state === "aisle" || p.helper) ? Math.abs(Math.sin(nowMs * 0.012 + i)) * 0.05 : 0;
            const pz = p.state === "down" ? 0.36 : (p.state === "seated" ? 0.88 : (0.85 + walkBob));
            const override = isPet ? null : { s: p.skin, h: p.hair, c: p.shirt };

            const stIdx = clamp(Math.round(p.x), 0, CABIN.STATIONS - 1);
            let extra = null;
            if (S.masksDropped[stIdx] && p.state === "seated" && !isPet) extra = "mask_on";
            else if (p.headphonesOn) extra = "headphones";
            else if (p.role === "influencer") extra = "phone";
            else if (p.helper) extra = "hivis";
            else if (p.state === "safe") extra = "mark_saved";

            queueSprite(p.x, p.y, pz, isPet ? 0.62 : 0.92, sprName, override, 1.0, extra);

            // Carry-On Hoarder's blocking suitcase in the center aisle!
            if (p.bagBlocking && p.state === "aisle") {
                queueSprite(p.x - 0.25, 0.0, 0.36, 0.68, "suitcase", null, 1.0, null);
            }
        }

        // 2. Flight Attendants (2D Pixel Art from cabin-sprites.js: purser & crew)
        for (let i = 0; i < S.crew.length; i++) {
            const c = S.crew[i];
            const bob = Math.abs(Math.sin(nowMs * 0.015 + i)) * 0.05;
            const sprName = (i === 0) ? "purser" : "crew";
            queueSprite(c.x, c.y || 0.0, 0.92 + bob, 1.02, sprName, null, 1.0, c.mode === "emergency" ? "hivis" : null);
        }

        // 3. Dangling Oxygen Masks (mask_on pixel art) & Taped Locker 9C (duct_tape pixel art)
        for (let i = 3; i <= 14; i++) {
            if (S.masksDropped[i]) {
                const sway = Math.sin(nowMs * 0.004 + i) * 0.04;
                queueSprite(i + sway, -0.78, 1.48, 0.42, "mask_on", null, 0.95);
                queueSprite(i + sway,  0.78, 1.48, 0.42, "mask_on", null, 0.95);
            }
        }
        if (S.core.inBin && S.core.binTaped) {
            queueSprite(S.core.x, -0.58, 1.88, 0.48, "duct_tape", null, 1.0);
        }

        // 4. Beverage Cart (drink_cart pixel art) & Galley Extinguishers (extinguisher / extinguisher_water)
        queueSprite(S.cart.x, S.cart.y || 0.0, 0.48, 0.86, "drink_cart", null, 1.0, S.cart.taped ? "duct_tape" : null);
        if (S.galleyItems.fwdHalon) {
            queueSprite(1.52, -0.82, 1.22, 0.56, "extinguisher", null, 1.0);
        }
        if (S.galleyItems.aftWaterExt) {
            queueSprite(14.60, 0.78, 1.22, 0.56, "extinguisher_water", null, 1.0);
        }

        // 5. Burning Lithium Vape Case (vape_case / vape_case_blue pixel art)
        if (!S.player.holdingCase && (!S.core.inBin || S.core.binOpen || S.core.inSink)) {
            const cx = S.core.inSink ? 16.05 : S.core.x;
            const cy = S.core.inSink ? -0.68 : S.core.y;
            const cz = S.core.inSink ? 0.96 : (S.core.inBin ? 1.84 : 0.25);
            queueSprite(cx, cy, cz, 0.54, S.core.stage2Blue ? "vape_case_blue" : "vape_case", null, 1.0);
        }

        // 6. 2D Pixel-Art Fire Plumes (fire_1..4, fire_blue, ember from cabin-sprites.js)
        for (let i = 1; i < CABIN.STATIONS - 1; i++) {
            const flm = S.fire[i];
            if (flm <= 1.5) continue;

            const isOrigin = (i === Math.round(S.core.x) && !S.core.inSink);
            const isBlue = (isOrigin && S.core.stage2Blue);
            let fName;
            if (isBlue) {
                fName = frameAlt ? "fire_blueb" : "fire_blue";
            } else {
                const tier = flm > 70 ? 4 : flm > 45 ? 3 : flm > 22 ? 2 : 1;
                fName = "fire_" + tier + (frameAlt ? "b" : "");
            }

            const fy = isOrigin ? S.core.y : ((i % 2 === 0 ? -0.55 : 0.55) * 0.65);
            const fz = (isOrigin && S.core.inBin) ? 1.76 : 0.52;
            const fSize = clamp(0.65 + (flm / 100) * 0.75, 0.65, 1.40);

            queueSprite(i, fy, fz, fSize, fName, null, 0.95);
            if (flm > 30) {
                queueSprite(i + (frameAlt ? 0.12 : -0.12), fy * 0.6, fz + 0.35, fSize * 0.75, "ember", null, 0.9);
            }
        }

        // Sort back-to-front (largest Z distance first)
        sprites.sort((a, b) => b.z - a.z);

        for (const s of sprites) {
            const stampCanvas = PRS.atlas.stamp(s.name, 4, s.override);
            if (!stampCanvas) continue;
            const drawW = Math.round(s.size);
            const drawH = Math.round(s.size);
            const dx = Math.round(s.x - drawW * 0.5);
            const dy = Math.round(s.y - drawH * 0.5);

            if (s.alpha < 0.99) {
                ctx.save();
                ctx.globalAlpha = s.alpha;
                ctx.drawImage(stampCanvas, dx, dy, drawW, drawH);
                ctx.restore();
            } else {
                ctx.drawImage(stampCanvas, dx, dy, drawW, drawH);
            }

            if (s.extra) {
                const exCanvas = PRS.atlas.stamp(s.extra, 3, null);
                if (exCanvas) {
                    const ew = Math.round(drawW * 0.55);
                    const eh = Math.round(drawH * 0.55);
                    ctx.drawImage(exCanvas, Math.round(s.x - ew * 0.5), Math.round(s.y - drawH * 0.45), ew, eh);
                }
            }
        }
    }

    // ----------------------------- Doom-Style 2D Pixel-Art First-Person Hands & Held Item ---
    function drawFirstPersonPixelHands(ctx, S, w, h, nowMs) {
        if (!PRS.atlas || !S.player.alive) return;
        const P = S.player;

        const bobX = Math.round(Math.cos(P.bobPhase * 0.5) * 10);
        const bobY = Math.round(Math.abs(Math.sin(P.bobPhase)) * 12);
        const swing = Math.sin(P.useAnim * Math.PI);
        const swingX = Math.round(-swing * 38);
        const swingY = Math.round(-swing * 46);

        const spriteSize = Math.round(clamp(h * 0.27, 112, 184));

        // 1. Left Hand: Welding Gloves pixel art if equipped, or Carried Passenger / Vape Case
        if (PRS.world.hasPassive(S, "gloves")) {
            const gloveStamp = PRS.atlas.stamp("fire_gloves", 6, null);
            const gs = Math.round(spriteSize * 0.72);
            ctx.drawImage(gloveStamp, Math.round(w * 0.18 + bobX), Math.round(h - gs * 0.82 + bobY), gs, gs);
        }

        // 2. Center/Right Held Object: Burning Vape Case, Carried Passenger, or Active Carry-On Item!
        let heldSprite = null;
        let heldOverride = null;

        if (P.holdingCase) {
            heldSprite = S.core.stage2Blue ? "vape_case_blue" : "vape_case";
        } else if (P.carrying.length > 0) {
            const px = S.pax.find((q) => q.id === P.carrying[0]);
            if (px && px.role === "pet") {
                heldSprite = "carried_pet";
            } else if (px) {
                heldSprite = "carried";
                heldOverride = { s: px.skin, h: px.hair, c: px.shirt };
            }
        } else {
            const slot = PRS.world.activeItem(S);
            if (slot && slot.def) {
                heldSprite = (slot.uses === 0 && slot.def.emptySprite) ? slot.def.emptySprite : (slot.def.sprite || "water_bottle");
            }
        }

        if (heldSprite) {
            const itemStamp = PRS.atlas.stamp(heldSprite, 8, heldOverride);
            const hx = Math.round((P.holdingCase ? w * 0.50 : w * 0.72) - spriteSize * 0.5 + bobX + swingX);
            const hy = Math.round(h - spriteSize * 0.88 + bobY + swingY);
            ctx.drawImage(itemStamp, hx, hy, spriteSize, spriteSize);

            // If holding burning case, draw animated pixel-art flame/sparks over it!
            if (P.holdingCase) {
                const frameAlt = Math.floor(nowMs / 160) % 2 === 1;
                const flmSpr = S.core.stage2Blue
                    ? (frameAlt ? "fire_blueb" : "fire_blue")
                    : (frameAlt ? "fire_2b" : "fire_2");
                const flmStamp = PRS.atlas.stamp(flmSpr, 6, null);
                const fs = Math.round(spriteSize * 0.65);
                ctx.drawImage(flmStamp, Math.round(hx + (spriteSize - fs) * 0.5), Math.round(hy - fs * 0.35), fs, fs);
            }
        }
    }

    function draw3DWaypoints(ctx, S, nowMs) {
        const P = S.player;
        const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.008);

        if (!S.core.inSink && !P.holdingCase) {
            const cz = S.core.inBin ? 1.88 : 0.45;
            const proj = project3D(S.core.x, S.core.y, cz);
            if (proj.visible && proj.z < 14) {
                const lbl = S.core.stage2Blue
                    ? "🔵 STAGE 2 BLUE JET (Grab Case [Right-Click / E]!)"
                    : S.core.inBin
                        ? (S.core.binOpen ? "🔥 OPEN LOCKER 9C (Grab Case [E] / Douse [F])" : "🔥 LOCKER 9C (" + S.core.cellsLeft + " Cells · Tape or Cool [F])")
                        : "🔥 BURNING VAPE CASE (Grab [Right-Click / E])";
                drawPill2D(ctx, proj.x, proj.y, lbl, "rgba(24, 12, 12, 0.88)", S.core.stage2Blue ? "#38bdf8" : "#f97316", "#fff", 11.5);
            }
        }

        const sinkProj = project3D(CABIN.LAV_X, -0.68, 1.12);
        if (sinkProj.visible && (P.holdingCase || Math.abs(P.x - CABIN.LAV_X) < 5.5)) {
            const sinkLbl = S.core.inSink
                ? "🚰 SINK: CASE SUBMERGED & SAFE!"
                : P.holdingCase
                    ? "🚰 DUNK BURNING CASE IN SINK HERE! [F / Left-Click]"
                    : "🚰 AFT LAVATORY SINK (Dunk Case / Refill Water)";
            drawPill2D(ctx, sinkProj.x, sinkProj.y, sinkLbl, "rgba(12, 24, 38, 0.88)", "#38bdf8", "#e0f2fe", P.holdingCase ? 13 : 11);
        }

        if (!S.detectorTriggered && Math.abs(P.x - CABIN.LAV_X) < 5.5) {
            const detProj = project3D(15.95, 0.0, 2.12);
            if (detProj.visible) {
                drawPill2D(ctx, detProj.x, detProj.y, "🚨 LAVATORY SMOKE ALARM (Look Up & Click [F] to Flip Crew!)", "rgba(38, 14, 18, 0.88)", "#f43f5e", "#fecdd3", 11);
            }
        }

        if (P.x < 5.0 && !S.clock.declared) {
            const ckProj = project3D(0.0, 0.0, 1.45);
            if (ckProj.visible) {
                const ready = S.crewAlerted || P.hasPhoto || S.credibility >= 50;
                drawPill2D(ctx, ckProj.x, ckProj.y,
                    ready ? "✈️ COCKPIT: DECLARE MAYDAY (-45s) [F]" : "🔒 COCKPIT (Need Photo Proof / Alarm First)",
                    "rgba(15, 23, 42, 0.88)", ready ? "#4ade80" : "#94a3b8", "#f8fafc", 11);
            }
        }

        if (P.carrying.length > 0) {
            for (const exX of [CABIN.FWD_EXIT_X, CABIN.AFT_EXIT_X]) {
                const exProj = project3D(exX, 0.0, 1.35);
                if (exProj.visible) {
                    drawPill2D(ctx, exProj.x, exProj.y,
                        "🚪 EXIT SAFE FLOOR (Drop Passenger [Right-Click / E] Here!)",
                        "rgba(12, 38, 24, 0.90)", "#4ade80", "#bbf7d0", 12 + pulse);
                }
            }
        }
    }

    function draw3DEntityLabels(ctx, S) {
        const P = S.player;

        for (const c of S.crew) {
            const dist = Math.abs(c.x - P.x);
            if (dist > 6.5) continue;
            const proj = project3D(c.x, c.y || 0, 1.48);
            if (!proj.visible) continue;

            const isPolice = c.mode !== "emergency";
            const badge = isPolice ? ("👮 " + c.name + " (SEATBELT POLICE)") : ("🫡 " + c.name + " (EMERGENCY CREW)");
            drawPill2D(ctx, proj.x, proj.y, badge, "rgba(15, 23, 42, 0.86)", isPolice ? "#f43f5e" : "#4ade80", "#fff", 10.5);

            if (c.bubble && c.bubbleTimer > 0) {
                drawPill2D(ctx, proj.x, proj.y - 24, "💬 \"" + c.bubble + "\"", "rgba(255, 255, 255, 0.94)", "#0f172a", "#0f172a", 11);
            }
        }

        for (const p of S.pax) {
            if (p.state === "carried" || p.state === "dead") continue;
            const dist = Math.hypot(p.x - P.x, p.y - P.y);
            if (dist > 3.6 && !(p.bubble && p.bubbleTimer > 0 && dist < 5.5)) continue;

            const pz = p.state === "down" ? 0.58 : (p.state === "seated" ? 1.26 : 1.34);
            const proj = project3D(p.x, p.y, pz);
            if (!proj.visible) continue;

            if (p.bubble && p.bubbleTimer > 0) {
                drawPill2D(ctx, proj.x, proj.y - 22, "💬 " + p.name.split(" ")[0] + ": \"" + p.bubble + "\"", "rgba(255, 255, 255, 0.94)", "#0f172a", "#0f172a", 11);
            }

            if (dist <= 2.8) {
                let tag = p.name.split(" ")[0] + " (" + p.seat + ")";
                let col = "#94a3b8";
                if (p.state === "down") { tag = "⚠️ " + p.name.split(" ")[0] + " UNCONSCIOUS!"; col = "#f43f5e"; }
                else if (p.helper) { tag = "🤝 " + p.name.split(" ")[0] + " (HELPER)"; col = "#4ade80"; }
                else if (p.bagBlocking && p.state === "aisle") { tag = "🧳 " + p.name.split(" ")[0] + " (SUITCASE BLOCKING!)"; col = "#facc15"; }
                else if (p.snitchTimer > 0) { tag = "🔔 " + p.name.split(" ")[0] + " (CALLING CREW!)"; col = "#f97316"; }
                else if (p.role === "influencer") { tag = "📱 " + p.name.split(" ")[0] + " (LIVESTREAMING)"; col = "#38bdf8"; }
                else if (p.role === "sleeper" && p.headphonesOn) { tag = "🎧 " + p.name.split(" ")[0] + " (ASLEEP)"; col = "#a855f7"; }

                drawPill2D(ctx, proj.x, proj.y, tag, "rgba(15, 23, 42, 0.82)", col, "#f8fafc", 10);
            }
        }
    }

    function drawCrosshairAndPrompts(ctx, w, h, S, prompts) {
        const cx = w * 0.5;
        const cy = h * 0.5;
        const hasTarget = !!(prompts.f || prompts.e);

        ctx.save();
        ctx.strokeStyle = hasTarget ? "#facc15" : "rgba(248, 250, 252, 0.75)";
        ctx.lineWidth = hasTarget ? 2.2 : 1.6;
        const gap = hasTarget ? 5 : 4;
        const len = hasTarget ? 11 : 7;

        ctx.beginPath();
        ctx.moveTo(cx - gap - len, cy); ctx.lineTo(cx - gap, cy);
        ctx.moveTo(cx + gap, cy);       ctx.lineTo(cx + gap + len, cy);
        ctx.moveTo(cx, cy - gap - len); ctx.lineTo(cx, cy - gap);
        ctx.moveTo(cx, cy + gap);       ctx.lineTo(cx, cy + gap + len);
        ctx.stroke();

        if (hasTarget) {
            ctx.beginPath();
            ctx.arc(cx, cy, 13, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        const focusPrompt = prompts.f || prompts.e;
        if (focusPrompt && focusPrompt.x !== undefined) {
            const tp = project3D(focusPrompt.x, focusPrompt.y || 0, focusPrompt.z || 1.0);
            if (tp.visible) {
                ctx.save();
                ctx.strokeStyle = focusPrompt.urgent ? "#facc15" : "#38bdf8";
                ctx.lineWidth = 2;
                ctx.strokeRect(tp.x - 18, tp.y - 18, 36, 36);
                ctx.restore();
            }
        }

        let py = cy + 34;
        if (prompts.f) {
            drawPill2D(ctx, cx, py, "🖱️ [Left-Click / F]  " + prompts.f.label, "rgba(24, 20, 8, 0.92)", "#f59e0b", "#fef08a", 12.5);
            py += 28;
        }
        if (prompts.e) {
            drawPill2D(ctx, cx, py, "🖐️ [Right-Click / E]  " + prompts.e.label, "rgba(8, 28, 18, 0.92)", "#22c55e", "#bbf7d0", 12.5);
        }
    }

    function drawPill2D(ctx, x, y, text, bg, border, fg, fontSize) {
        ctx.save();
        ctx.font = "700 " + (fontSize || 11.5) + "px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
        const padX = 10;
        const tw = ctx.measureText(text).width;
        const bw = tw + padX * 2;
        const bh = (fontSize || 11.5) + 11;
        const bx = clamp(x - bw * 0.5, 6, (ctx.canvas.clientWidth || 960) - bw - 6);
        const by = clamp(y - bh * 0.5, 6, (ctx.canvas.clientHeight || 540) - bh - 6);

        ctx.fillStyle = bg;
        ctx.strokeStyle = border;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = fg;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, bx + bw * 0.5, by + bh * 0.5 + 0.5);
        ctx.restore();
    }

    // ----------------------------------- Top Full-Plane Pixel-Art Radar Minimap Strip ---
    function drawMinimap(canvas, S) {
        if (!canvas || !S) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth || 800;
        const h = canvas.clientHeight || 52;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        }
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);

        const padX = 24;
        const usableW = w - padX * 2;
        const stW = usableW / CABIN.STATIONS;

        ctx.fillStyle = "#131c2e";
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(padX - 8, 4, usableW + 16, h - 8, 14);
        ctx.fill();
        ctx.stroke();

        for (let i = 0; i < CABIN.STATIONS; i++) {
            const sx = padX + i * stW;
            const smk = S.smoke[i] || 0;
            const flm = S.fire[i] || 0;

            if (smk > 5) {
                ctx.fillStyle = "rgba(100, 116, 139, " + clamp(smk / 140, 0.1, 0.65) + ")";
                ctx.fillRect(sx + 1, 6, stW - 2, h - 12);
            }
            if (flm > 2 && PRS.atlas) {
                const fSpr = (S.core.stage2Blue && Math.round(S.core.x) === i) ? "fire_blue" : "fire_2";
                PRS.atlas.blit(ctx, fSpr, sx + stW * 0.5 - 8, h * 0.5 - 6, 1);
            }

            if (i === CABIN.FWD_EXIT_X || i === CABIN.AFT_EXIT_X) {
                ctx.fillStyle = "rgba(74, 222, 128, 0.22)";
                ctx.fillRect(sx + 1, 6, stW - 2, h - 12);
            }

            ctx.fillStyle = "#64748b";
            ctx.font = "700 9px ui-monospace, monospace";
            ctx.textAlign = "center";
            const lbl = i === 0 ? "CKP" : i === 1 ? "L1" : i === 15 ? "L2" : i === 16 ? "LAV" : (CABIN.X_TO_ROW[i] ? "R" + CABIN.X_TO_ROW[i] : "");
            if (lbl) ctx.fillText(lbl, sx + stW * 0.5, 14);
        }

        // Pixel-art passenger & crew heads on minimap
        for (const p of S.pax) {
            if (p.state === "dead" || p.state === "carried") continue;
            const px = padX + (p.x + 0.5) * stW;
            const py = h * 0.58 + (p.y / 1.35) * 12;
            if (PRS.atlas) {
                PRS.atlas.blit(ctx, p.role === "pet" ? "pet_carrier" : "pax", px - 6, py - 6, 1, { s: p.skin, h: p.hair, c: p.shirt });
            }
        }

        for (const c of S.crew) {
            const cx = padX + (c.x + 0.5) * stW;
            if (PRS.atlas) {
                PRS.atlas.blit(ctx, "crew", cx - 8, h * 0.58 - 8, 1);
            }
        }

        // Player position & 3D look cone + pixel-art player ring
        const P = S.player;
        const plX = padX + (P.x + 0.5) * stW;
        const plY = h * 0.58 + (P.y / 1.35) * 12;
        const coneLen = 22;
        ctx.fillStyle = "rgba(250, 204, 21, 0.28)";
        ctx.beginPath();
        ctx.moveTo(plX, plY);
        ctx.lineTo(plX + Math.cos(P.yaw - 0.45) * coneLen, plY + Math.sin(P.yaw - 0.45) * 10);
        ctx.lineTo(plX + Math.cos(P.yaw + 0.45) * coneLen, plY + Math.sin(P.yaw + 0.45) * 10);
        ctx.closePath();
        ctx.fill();

        if (PRS.atlas) {
            PRS.atlas.blit(ctx, "player_ring", plX - 8, plY - 8, 1);
        }

        ctx.restore();
    }

    function hitTestMinimap(canvas, clientX) {
        const rect = canvas.getBoundingClientRect();
        const padX = 24;
        const usableW = rect.width - padX * 2;
        const rel = clamp01((clientX - rect.left - padX) / Math.max(1, usableW));
        return clamp(rel * CABIN.STATIONS - 0.5, 0.5, CABIN.STATIONS - 0.5);
    }

    PRS.render3d = {
        resetCamera,
        drawScene3D,
        drawMinimap,
        hitTestMinimap,
        project3D
    };
})(window);
