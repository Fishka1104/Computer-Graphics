function setupWebGL() {
  const canvas = document.getElementById("glcanvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

  const btnModePoints = document.getElementById("btnModePoints");
  const btnModeTriangles = document.getElementById("btnModeTriangles");
  const btnModeCircles = document.getElementById("btnModeCircles");
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

  // Стан інтерактивного редактора
  let currentMode = "points"; // 'points', 'triangles', 'circles'
  let pointsData = [];        // Окремі точки: [x, y, r, g, b, ...]
  let trianglesData = [];     // Вершини трикутників: [x, y, r, g, b, ...]
  let pendingTriangle = [];   // Тимчасові вершини незавершеного трикутника
  let circlesList = [];       // Масив кіл: [ { vertices: [...], count: N }, ... ]
  let pendingCircleCenter = null; // { x, y, r, g, b } при першому кліку в режимі кола

  function updateModeButtons() {
    [btnModePoints, btnModeTriangles, btnModeCircles].forEach(btn => btn.classList.remove("btn-active"));
    if (currentMode === "points") btnModePoints.classList.add("btn-active");
    if (currentMode === "triangles") btnModeTriangles.classList.add("btn-active");
    if (currentMode === "circles") btnModeCircles.classList.add("btn-active");
  }

  function updateInfoBadge() {
    const pCount = pointsData.length / 5;
    const tCount = trianglesData.length / 15;
    const cCount = circlesList.length;

    let modeName = "Точки";
    let extra = "";
    if (currentMode === "triangles") {
      modeName = "Трикутники";
      const p = pendingTriangle.length / 5;
      if (p > 0) extra = ` (побудова трикутника: ${p}/3)`;
    } else if (currentMode === "circles") {
      modeName = "Кола";
      if (pendingCircleCenter) {
        extra = " (центр встановлено! клікніть для радіуса)";
      } else {
        extra = " (клікніть для центру кола)";
      }
    }

    infoBadge.textContent = `Активний режим: ${modeName} | Точок: ${pCount} | Трикутників: ${tCount} | Кіл: ${cCount}${extra}`;
  }

  function render() {
    const [bgR, bgG, bgB] = hexToRgb(bgColorInput.value);
    gl.clearColor(bgR, bgG, bgB, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Збираємо тимчасові вершини, які відображаються як точки (попередній перегляд)
    const tempPoints = [...pendingTriangle];
    if (pendingCircleCenter) {
      tempPoints.push(
        pendingCircleCenter.x,
        pendingCircleCenter.y,
        pendingCircleCenter.r,
        pendingCircleCenter.g,
        pendingCircleCenter.b
      );
    }

    // Збираємо вершини всіх кіл
    let allCirclesData = [];
    circlesList.forEach(c => {
      allCirclesData.push(...c.vertices);
    });

    // Загальний масив вершин: [Трикутники, Точки, Вершини кіл]
    const combinedData = [
      ...trianglesData,
      ...pointsData,
      ...tempPoints,
      ...allCirclesData
    ];

    const totalVertexCount = combinedData.length / 5;

    if (totalVertexCount > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(combinedData), gl.DYNAMIC_DRAW);

      const triangleVertexCount = trianglesData.length / 5;
      const pointVertexCount = (pointsData.length + tempPoints.length) / 5;

      // 1. Малювання всіх трикутників (один виклик)
      if (triangleVertexCount > 0) {
        gl.drawArrays(gl.TRIANGLES, 0, triangleVertexCount);
      }

      // 2. Малювання всіх точок (один виклик)
      if (pointVertexCount > 0) {
        gl.drawArrays(gl.POINTS, triangleVertexCount, pointVertexCount);
      }

      // 3. Малювання кіл за допомогою gl.TRIANGLE_FAN
      let currentOffset = triangleVertexCount + pointVertexCount;
      for (let i = 0; i < circlesList.length; i++) {
        const c = circlesList[i];
        gl.drawArrays(gl.TRIANGLE_FAN, currentOffset, c.count);
        currentOffset += c.count;
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
      if (pendingTriangle.length === 15) {
        trianglesData.push(...pendingTriangle);
        pendingTriangle = [];
      }
    } else if (currentMode === "circles") {
      if (!pendingCircleCenter) {
        // 1-й клік: фіксуємо центр кола (додаємо тимчасову точку)
        pendingCircleCenter = { x: glX, y: glY, r, g, b };
      } else {
        // 2-й клік: обчислюємо радіус кола
        const dx = glX - pendingCircleCenter.x;
        const dy = glY - pendingCircleCenter.y;
        const radius = Math.sqrt(dx * dx + dy * dy);

        if (radius > 0.01) {
          const segments = 48; // кількість сегментів для гладкого кола
          const circleVertices = [];

          // Центральна вершина віяла TRIANGLE_FAN
          circleVertices.push(
            pendingCircleCenter.x,
            pendingCircleCenter.y,
            pendingCircleCenter.r,
            pendingCircleCenter.g,
            pendingCircleCenter.b
          );

          // Вершини окружності
          for (let i = 0; i <= segments; i++) {
            const angle = (i * 2 * Math.PI) / segments;
            const px = pendingCircleCenter.x + radius * Math.cos(angle);
            const py = pendingCircleCenter.y + radius * Math.sin(angle);
            circleVertices.push(
              px,
              py,
              pendingCircleCenter.r,
              pendingCircleCenter.g,
              pendingCircleCenter.b
            );
          }

          // Додаємо до масиву кіл (1 центр + segments + 1 замикаюча вершина)
          circlesList.push({
            vertices: circleVertices,
            count: segments + 2
          });
        }

        // Видаляємо тимчасовий центр зі списку точок згідно з методичкою
        pendingCircleCenter = null;
      }
    }

    render();
  });

  btnModePoints.addEventListener("click", function () {
    currentMode = "points";
    pendingCircleCenter = null;
    updateModeButtons();
    render();
  });

  btnModeTriangles.addEventListener("click", function () {
    currentMode = "triangles";
    pendingCircleCenter = null;
    updateModeButtons();
    render();
  });

  btnModeCircles.addEventListener("click", function () {
    currentMode = "circles";
    pendingTriangle = [];
    updateModeButtons();
    render();
  });

  clearBtn.addEventListener("click", function () {
    pointsData = [];
    trianglesData = [];
    pendingTriangle = [];
    circlesList = [];
    pendingCircleCenter = null;
    render();
  });

  bgColorInput.addEventListener("input", render);

  render();
}

window.onload = setupWebGL;
