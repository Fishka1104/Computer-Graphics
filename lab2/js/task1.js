function setupWebGL() {
  const canvas = document.getElementById("glcanvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  const infoBadge = document.getElementById("infoBadge");

  if (!gl) {
    alert("Помилка: WebGL не підтримується вашим браузером.");
    return;
  }

  // Налаштування Viewport та початкового кольору очищення
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.95, 0.95, 0.98, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Вершинний шейдер
  const vsSource = `
    attribute vec4 a_Position;
    void main() {
        gl_Position = a_Position;
        gl_PointSize = 10.0;
    }
  `;

  // Фрагментний шейдер
  const fsSource = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
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

  // Отримання локацій атрибутів та uniform-змінних
  const a_Position = gl.getAttribLocation(program, "a_Position");
  const u_FragColor = gl.getUniformLocation(program, "u_FragColor");

  // Встановлюємо фіксований колір точок
  gl.uniform4f(u_FragColor, 0.16, 0.5, 0.73, 1.0);

  // Створення буфера для динамічних вершин
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Масив для збереження координат точок
  const points = [];

  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (points.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.POINTS, 0, points.length / 2);
    }

    if (infoBadge) {
      infoBadge.textContent = `Кількість точок: ${points.length / 2}`;
    }
  }

  // Обробник натискання миші з коригуванням координат
  canvas.addEventListener("mousedown", function (event) {
    // Отримуємо положення Canvas у клієнтській області
    const rect = event.target.getBoundingClientRect();

    // Обчислюємо точні координати курсора всередині Canvas
    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;

    // Перетворюємо у систему координат WebGL (-1.0 .. 1.0)
    const glX = (clientX - canvas.width / 2) / (canvas.width / 2);
    const glY = (canvas.height / 2 - clientY) / (canvas.height / 2);

    points.push(glX, glY);
    render();
  });

  render();
}

window.onload = setupWebGL;

