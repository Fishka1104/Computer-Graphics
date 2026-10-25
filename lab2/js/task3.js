function setupWebGL() {
  const canvas = document.getElementById("glcanvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  const btnModePoints = document.getElementById("btnModePoints");
  const btnModeTriangles = document.getElementById("btnModeTriangles");
  const brushColorInput = document.getElementById("brushColor");
  const bgColorInput = document.getElementById("bgColor");
  const clearBtn = document.getElementById("clearBtn");
  const infoBadge = document.getElementById("infoBadge");

  if (!gl) {
    alert("Помилка: WebGL не підтримується вашим браузером.");
    return;
  }

  function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = ((bigint >> 16) & 255) / 255.0;
    const g = ((bigint >> 8) & 255) / 255.0;
    const b = (bigint & 255) / 255.0;
    return [r, g, b];
  }

  const vsSource = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    varying vec4 v_Color;
    void main() {
        gl_Position = a_Position;
        gl_PointSize = 10.0;
        v_Color = a_Color;
    }
  `;

  const fsSource = `
    precision mediump float;
    varying vec4 v_Color;
    void main() {
        gl_FragColor = v_Color;
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Помилка компіляції шейдера:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Помилка лінкування програми:", gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const a_Position = gl.getAttribLocation(program, "a_Position");
  const a_Color = gl.getAttribLocation(program, "a_Color");

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  const FSIZE = Float32Array.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
  gl.enableVertexAttribArray(a_Color);

  gl.viewport(0, 0, canvas.width, canvas.height);

  // Стан програми
  let currentMode = "points"; // 'points' або 'triangles'
  let pointsData = [];        // Точки: [x, y, r, g, b, ...]
  let trianglesData = [];     // Трикутники: [x, y, r, g, b, ...]
  let pendingTriangle = [];   // Тимчасові вершини неповного трикутника

  function updateModeButtons() {
    if (currentMode === "points") {
      btnModePoints.classList.add("btn-active");
      btnModeTriangles.classList.remove("btn-active");
    } else {
      btnModePoints.classList.remove("btn-active");
      btnModeTriangles.classList.add("btn-active");
    }
  }

  function updateInfoBadge() {
    const pCount = pointsData.length / 5;
    const tCount = trianglesData.length / 15;
    const pending = pendingTriangle.length / 5;
    const modeName = currentMode === "points" ? "Точки" : "Трикутники";
    infoBadge.textContent = `Активний режим: ${modeName} | Точок: ${pCount} | Трикутників: ${tCount}` + 
      (pending > 0 ? ` (побудова трикутника: ${pending}/3)` : "");
  }

  // Оптимізована візуалізація з мінімальною кількістю викликів drawArrays
  function render() {
    const [r, g, b] = hexToRgb(bgColorInput.value);
    gl.clearColor(r, g, b, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Об'єднуємо всі вершини: спочатку трикутники, потім окремі точки та незавершені вершини
    const combinedData = [...trianglesData, ...pointsData, ...pendingTriangle];
    const totalVertices = combinedData.length / 5;

    if (totalVertices > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(combinedData), gl.DYNAMIC_DRAW);

      const triangleVertexCount = trianglesData.length / 5;
      const pointVertexCount = (pointsData.length + pendingTriangle.length) / 5;

      // 1-й виклик: усі трикутники разом
      if (triangleVertexCount > 0) {
        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexCount);
      }

      // 2-й виклик: усі точки (включаючи проміжні вершини поточного трикутника)
      if (pointVertexCount > 0) {
        gl.drawArrays(gl.POINTS, triangleVertexCount, pointVertexCount);
      }
    }

    updateInfoBadge();
  }

  canvas.addEventListener("mousedown", function (event) {
    const rect = event.target.getBoundingClientRect();
    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;

    const glX = (clientX - canvas.width / 2) / (canvas.width / 2);
    const glY = (canvas.height / 2 - clientY) / (canvas.height / 2);
    const [r, g, b] = hexToRgb(brushColorInput.value);

    if (currentMode === "points") {
      pointsData.push(glX, glY, r, g, b);
    } else if (currentMode === "triangles") {
      pendingTriangle.push(glX, glY, r, g, b);
      if (pendingTriangle.length === 15) { // 3 вершини по 5 значень
        trianglesData.push(...pendingTriangle);
        pendingTriangle = [];
      }
    }

    render();
  });

  btnModePoints.addEventListener("click", function () {
    currentMode = "points";
    updateModeButtons();
    updateInfoBadge();
  });

  btnModeTriangles.addEventListener("click", function () {
    currentMode = "triangles";
    updateModeButtons();
    updateInfoBadge();
  });

  clearBtn.addEventListener("click", function () {
    pointsData = [];
    trianglesData = [];
    pendingTriangle = [];
    render();
  });

  bgColorInput.addEventListener("input", render);

  render();
}

window.onload = setupWebGL;

