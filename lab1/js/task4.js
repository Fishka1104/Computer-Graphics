function setupWebGL() {
  const canvas = document.getElementById("glcanvas");
  const gl =
    canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    alert("Помилка: WebGL не підтримується вашим браузером.");
    return;
  }

  // Налаштування Viewport та колір очищення
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0); // Білий фон прапора

  const vsSource = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    varying vec4 v_Color;
    uniform vec4 u_Translation;

    void main() {
        gl_Position = a_Position + u_Translation;
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
    console.error(
      "Помилка лінкування програми:",
      gl.getProgramInfoLog(program),
    );
    return;
  }

  gl.useProgram(program);

  // Кольори синіх елементів: #0038b8 -> (0.0, 0.22, 0.72)
  const verticesColors = new Float32Array([
    // СТАТИЧНИЙ ФОН
    // Верхня синя смуга (gl.TRIANGLES, 6 вершин)
    -1.0,
    0.75,
    0.0,
    0.22,
    0.72,
    1.0,
    0.75,
    0.0,
    0.22,
    0.72,
    -1.0,
    0.5,
    0.0,
    0.22,
    0.72,
    -1.0,
    0.5,
    0.0,
    0.22,
    0.72,
    1.0,
    0.75,
    0.0,
    0.22,
    0.72,
    1.0,
    0.5,
    0.0,
    0.22,
    0.72,

    // Нижня синя смуга (gl.TRIANGLES, 6 вершин)
    -1.0,
    -0.5,
    0.0,
    0.22,
    0.72,
    1.0,
    -0.5,
    0.0,
    0.22,
    0.72,
    -1.0,
    -0.75,
    0.0,
    0.22,
    0.72,
    -1.0,
    -0.75,
    0.0,
    0.22,
    0.72,
    1.0,
    -0.5,
    0.0,
    0.22,
    0.72,
    1.0,
    -0.75,
    0.0,
    0.22,
    0.72,

    // РУХОМА ЗІРКА (gl.TRIANGLE_FAN, 14 вершин)
    // Центр фігури
    0.0,
    0.0,
    0.0,
    0.22,
    0.72,
    // Вершини по колу (чергування зовнішніх і внутрішніх кутів)
    0.0,
    0.4,
    0.0,
    0.22,
    0.72, // Верхній зовнішній
    0.115,
    0.2,
    0.0,
    0.22,
    0.72, // Внутрішній
    0.346,
    0.2,
    0.0,
    0.22,
    0.72, // Правий верхній зовнішній
    0.23,
    0.0,
    0.0,
    0.22,
    0.72, // Внутрішній
    0.346,
    -0.2,
    0.0,
    0.22,
    0.72, // Правий нижній зовнішній
    0.115,
    -0.2,
    0.0,
    0.22,
    0.72, // Внутрішній
    0.0,
    -0.4,
    0.0,
    0.22,
    0.72, // Нижній зовнішній
    -0.115,
    -0.2,
    0.0,
    0.22,
    0.72, // Внутрішній
    -0.346,
    -0.2,
    0.0,
    0.22,
    0.72, // Лівий нижній зовнішній
    -0.23,
    0.0,
    0.0,
    0.22,
    0.72, // Внутрішній
    -0.346,
    0.2,
    0.0,
    0.22,
    0.72, // Лівий верхній зовнішній
    -0.115,
    0.2,
    0.0,
    0.22,
    0.72, // Внутрішній
    0.0,
    0.4,
    0.0,
    0.22,
    0.72, // Замикання контуру
  ]);

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  const FSIZE = verticesColors.BYTES_PER_ELEMENT;

  const a_Position = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);

  const a_Color = gl.getAttribLocation(program, "a_Color");
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
  gl.enableVertexAttribArray(a_Color);

  const u_Translation = gl.getUniformLocation(program, "u_Translation");
  let time = 0.0;

  function draw() {
    time += 0.05;
    const dy = Math.sin(time) * 0.12;

    gl.clear(gl.COLOR_BUFFER_BIT);

    // 1. Статичні смуги (без зсуву, 12 вершин)
    gl.uniform4f(u_Translation, 0.0, 0.0, 0.0, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 12);

    // 2. Рухома фігура (зсув по осі Y, 14 вершин з індексу 12)
    gl.uniform4f(u_Translation, 0.0, dy, 0.0, 0.0);
    gl.drawArrays(gl.TRIANGLE_FAN, 12, 14);

    requestAnimationFrame(draw);
  }
  draw();
}

window.onload = setupWebGL;
