export type Rgba = [number, number, number, number];

export function hexToRgba(hex: string, alpha: number): Rgba {
	const h = hex.replace("#", "");
	const n =
		h.length === 3
			? h
					.split("")
					.map((c) => c + c)
					.join("")
			: h;
	const v = Number.parseInt(n, 16);
	return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255, alpha];
}

const VERT_SRC = `#version 300 es
in vec2 a_pos;
in vec4 a_color;
uniform vec2 u_resolution;
uniform vec2 u_translate;
uniform float u_scale;
out vec4 v_color;
void main() {
  vec2 screen = (a_pos - u_translate) * u_scale;
  vec2 clip = screen / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_color = a_color;
}`;

const FRAG_SRC = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 outColor;
void main() {
  outColor = v_color;
}`;

export type GraphViewUniforms = {
	translate: { x: number; y: number };
	scale: number;
	width: number;
	height: number;
};

export class WebGLGraphContext {
	readonly gl: WebGL2RenderingContext;
	private program: WebGLProgram;
	private uResolution: WebGLUniformLocation;
	private uTranslate: WebGLUniformLocation;
	private uScale: WebGLUniformLocation;
	private aPos: number;
	private aColor: number;
	private vao: WebGLVertexArrayObject;
	private buffer: WebGLBuffer;
	capacity = 0;
	private data = new Float32Array(0);

	constructor(canvas: HTMLCanvasElement) {
		const gl = canvas.getContext("webgl2", {
			alpha: true,
			antialias: true,
			premultipliedAlpha: true,
		});
		if (!gl) throw new Error("WebGL2 not available");
		this.gl = gl;

		const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
		const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
		const program = gl.createProgram()!;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
		}
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		this.program = program;

		this.uResolution = gl.getUniformLocation(program, "u_resolution")!;
		this.uTranslate = gl.getUniformLocation(program, "u_translate")!;
		this.uScale = gl.getUniformLocation(program, "u_scale")!;
		this.aPos = gl.getAttribLocation(program, "a_pos");
		this.aColor = gl.getAttribLocation(program, "a_color");

		this.vao = gl.createVertexArray()!;
		this.buffer = gl.createBuffer()!;
		gl.bindVertexArray(this.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		const stride = 6 * 4;
		gl.enableVertexAttribArray(this.aPos);
		gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, stride, 0);
		gl.enableVertexAttribArray(this.aColor);
		gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, stride, 8);
		gl.bindVertexArray(null);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	}

	resizeBuffer(vertexCount: number) {
		const floats = vertexCount * 6;
		if (floats > this.data.length) {
			this.data = new Float32Array(Math.max(floats, this.data.length * 2 || 4096));
		}
		this.capacity = vertexCount;
		return this.data;
	}

	begin(view: GraphViewUniforms, viewportW?: number, viewportH?: number) {
		const { gl } = this;
		gl.viewport(0, 0, viewportW ?? view.width, viewportH ?? view.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(this.program);
		gl.uniform2f(this.uResolution, view.width, view.height);
		gl.uniform2f(this.uTranslate, view.translate.x, view.translate.y);
		gl.uniform1f(this.uScale, view.scale);
	}

	flush(vertexCount: number) {
		if (vertexCount <= 0) return;
		const { gl } = this;
		gl.bindVertexArray(this.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, vertexCount * 6), gl.DYNAMIC_DRAW);
		gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
		gl.bindVertexArray(null);
	}
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string) {
	const shader = gl.createShader(type)!;
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		throw new Error(gl.getShaderInfoLog(shader) ?? "compile failed");
	}
	return shader;
}

let writeIdx = 0;

export function resetWriter() {
	writeIdx = 0;
}

export function writerCount() {
	return writeIdx;
}

export function pushTri(
	data: Float32Array,
	ax: number,
	ay: number,
	bx: number,
	by: number,
	cx: number,
	cy: number,
	color: Rgba,
) {
	const [r, g, b, a] = color;
	let i = writeIdx * 6;
	const w = (v: number, x: number, y: number) => {
		data[i++] = x;
		data[i++] = y;
		data[i++] = r;
		data[i++] = g;
		data[i++] = b;
		data[i++] = a;
	};
	w(0, ax, ay);
	w(0, bx, by);
	w(0, cx, cy);
	writeIdx += 3;
}

export function pushRect(
	data: Float32Array,
	x: number,
	y: number,
	w: number,
	h: number,
	color: Rgba,
) {
	pushTri(data, x, y, x + w, y, x + w, y + h, color);
	pushTri(data, x, y, x + w, y + h, x, y + h, color);
}

export function pushRectOutline(
	data: Float32Array,
	x: number,
	y: number,
	w: number,
	h: number,
	thickness: number,
	color: Rgba,
) {
	pushRect(data, x, y, w, thickness, color);
	pushRect(data, x, y + h - thickness, w, thickness, color);
	pushRect(data, x, y, thickness, h, color);
	pushRect(data, x + w - thickness, y, thickness, h, color);
}

/** Screen-space axis-aligned rect (selection overlays, etc.). */
export function pushScreenRect(
	data: Float32Array,
	view: GraphViewUniforms,
	sx: number,
	sy: number,
	sw: number,
	sh: number,
	color: Rgba,
) {
	const gx = sx / view.scale + view.translate.x;
	const gy = sy / view.scale + view.translate.y;
	pushRect(data, gx, gy, sw / view.scale, sh / view.scale, color);
}
