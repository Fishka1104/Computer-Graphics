function setupWebGL() {
  const canvas = document.getElementById("glcanvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  const pointColorInput = document.getElementById("pointColor");
  const bgColorInput = document.getElementById("bgColor");
  const clearBtn = document.getElementById("clearBtn");
  const infoBadge = document.getElementById("infoBadge");

  if (!gl) {
    alert("Помилка: WebGL не підтримується вашим браузером.");
    return;
  }

  // Функція конвертації HEX кольору в [r, g, b] (0..1)
  function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = ((bigint >> 16) & 255) / 255.0;
    const g = ((bigint >> 8) & 255) / 255.0;
    const b = (bigint & 255) / 255.0;
    return [r, g, b];
  }

  // Оновлений вершинний шейдер
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

  // Оновлений фрагментний шейдер
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

  // Налаштування атрибутів з чергуванням (stride = 5 * FSIZE)
  // x, y, r, g, b
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
  gl.enableVertexAttribArray(a_Color);

  gl.viewport(0, 0, canvas.width, canvas.height);

  // Масив для збереження точок: [x, y, r, g, b, ...]
  let pointsData = [];

  function updateClearColor() {
    const [r, g, b] = hexToRgb(bgColorInput.value);
    gl.clearColor(r, g, b, 1.0);
  }

  function render() {
    updateClearColor();
    gl.clear(gl.COLOR_BUFFER_BIT);

    const count = pointsData.length / 5;
    if (count > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointsData), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    if (infoBadge) {
      infoBadge.textContent = `Кількість точок: ${count}`;
    }
  }

  // Обробник додавання точки
  canvas.addEventListener("mousedown", function (event) {
    const rect = event.target.getBoundingClientRect();
    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;

    const glX = (clientX - canvas.width / 2) / (canvas.width / 2);
    const glY = (canvas.height / 2 - clientY) / (canvas.height / 2);

    const [r, g, b] = hexToRgb(pointColorInput.value);
    pointsData.push(glX, glY, r, g, b);

    render();
  });

  // Кнопка очищення
  clearBtn.addEventListener("click", function () {
    pointsData = [];
    render();
  });

  // Зміна кольору фону
  bgColorInput.addEventListener("input", function () {
    render();
  });

  render();
}

window.onload = setupWebGL;

