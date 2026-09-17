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
  gl.clearColor(0.9, 0.9, 0.9, 1.0);

  const vsSource = `
    attribute vec4 a_Position;
    uniform mat4 u_ModelMatrix;
    void main() {
        gl_Position = u_ModelMatrix * a_Position;
    }
  `;

  const fsSource = `
    precision mediump float;
    void main() {
        gl_FragColor = vec4(0.2, 0.6, 0.8, 1.0);
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

  // Квадрат, що складається з 2-х трикутників (6 вершин)
  const vertices = new Float32Array([
    -0.4,
    0.4, // Трикутник 1
    -0.4,
    -0.4,
    0.4,
    0.4,
    0.4,
    0.4, // Трикутник 2
    -0.4,
    -0.4,
    0.4,
    -0.4,
  ]);

  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const a_Position = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  const u_ModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
  let angle = 0.0;

  function draw() {
    angle += 0.02; // Швидкість обертання

    const cosB = Math.cos(angle);
    const sinB = Math.sin(angle);

    // Матриця повороту навколо осі Z
    const matrix = new Float32Array([
      cosB,
      sinB,
      0.0,
      0.0,
      -sinB,
      cosB,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
    ]);

    gl.uniformMatrix4fv(u_ModelMatrix, false, matrix);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(draw);
  }
  draw();
}

window.onload = setupWebGL;
