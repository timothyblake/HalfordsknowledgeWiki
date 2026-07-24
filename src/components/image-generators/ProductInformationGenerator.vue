<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

const title = ref('Diagnostic Check');
const titleSize = ref(96);
const bullets = ref<string[]>([
	'Quickly identify the cause of warning lights',
	'Peace of mind that your vehicle is in safe condition',
	'Receive expert advice and recommendations from our highly trained technicians',
]);
const bulletSize = ref(52);
const cornerRadius = ref(32);
const format = ref<'png' | 'jpeg'>('png');
const statusMessage = ref('');

const previewCanvas = ref<HTMLCanvasElement | null>(null);

const width = 1400;
const height = 980;
const padding = 120;
const background = '#f2f2f2';
const textColour = '#252525';
const fontFamily = '"Aktiv Grotesk", Arial, sans-serif';
let animationFrame = 0;

const roundedRectPath = (context: CanvasRenderingContext2D, x: number, y: number, rectWidth: number, rectHeight: number, radius: number) => {
	const safeRadius = Math.max(0, Math.min(radius, rectWidth / 2, rectHeight / 2));
	context.beginPath();
	context.moveTo(x + safeRadius, y);
	context.lineTo(x + rectWidth - safeRadius, y);
	context.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + safeRadius);
	context.lineTo(x + rectWidth, y + rectHeight - safeRadius);
	context.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - safeRadius, y + rectHeight);
	context.lineTo(x + safeRadius, y + rectHeight);
	context.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - safeRadius);
	context.lineTo(x, y + safeRadius);
	context.quadraticCurveTo(x, y, x + safeRadius, y);
	context.closePath();
};

const drawBackground = (context: CanvasRenderingContext2D, rectWidth: number, rectHeight: number, colour: string, radius: number) => {
	roundedRectPath(context, 0, 0, rectWidth, rectHeight, radius);
	context.fillStyle = colour;
	context.fill();
};

const breakLongWord = (context: CanvasRenderingContext2D, word: string, maxWidth: number) => {
	const fragments: string[] = [];
	let fragment = '';
	for (const character of word) {
		const candidate = fragment + character;
		if (fragment && context.measureText(candidate).width > maxWidth) {
			fragments.push(fragment);
			fragment = character;
		} else {
			fragment = candidate;
		}
	}
	if (fragment) fragments.push(fragment);
	return fragments;
};

const wrapParagraph = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
	const words = text.trim().split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let line = '';

	for (const word of words) {
		const candidate = line ? `${line} ${word}` : word;
		if (context.measureText(candidate).width <= maxWidth) {
			line = candidate;
			continue;
		}

		if (line) lines.push(line);
		line = '';
		if (context.measureText(word).width <= maxWidth) {
			line = word;
		} else {
			const fragments = breakLongWord(context, word, maxWidth);
			lines.push(...fragments.slice(0, -1));
			line = fragments.at(-1) ?? '';
		}
	}

	if (line) lines.push(line);
	return lines;
};

const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) =>
	text.split(/\r?\n/).flatMap((paragraph) => paragraph.trim() ? wrapParagraph(context, paragraph, maxWidth) : ['']);

const measureLayout = (context: CanvasRenderingContext2D, tSize: number, bSize: number) => {
	const maxTextWidth = width - padding * 2;
	context.font = `800 ${tSize}px ${fontFamily}`;
	const titleLines = title.value ? wrapText(context, title.value, maxTextWidth) : [];
	const titleLineHeight = tSize * 1.1;

	context.font = `400 ${bSize}px ${fontFamily}`;
	const pointTextWidth = maxTextWidth - 44;
	const pointLines = bullets.value.filter(Boolean).map((point) => wrapText(context, point, pointTextWidth));
	const bulletLineHeight = bSize * 1.35;
	const bulletGap = Math.max(26, bSize * 0.58);
	const titleHeight = titleLines.length * titleLineHeight;
	const bulletsHeight = pointLines.reduce((total, lines, index) => total + lines.length * bulletLineHeight + (index < pointLines.length - 1 ? bulletGap : 0), 0);
	const sectionGap = titleLines.length && pointLines.length ? 52 : 0;

	return {
		titleLines,
		pointLines,
		titleLineHeight,
		bulletLineHeight,
		bulletGap,
		sectionGap,
		totalHeight: padding * 2 + titleHeight + sectionGap + bulletsHeight,
	};
};

const drawTitle = (context: CanvasRenderingContext2D, lines: string[], fontSize: number, x: number, y: number, lineHeight: number) => {
	context.font = `800 ${fontSize}px ${fontFamily}`;
	context.fillStyle = textColour;
	context.textBaseline = 'top';
	for (const line of lines) {
		context.fillText(line, x, y);
		y += lineHeight;
	}
	return y;
};

const drawBulletPoints = (context: CanvasRenderingContext2D, points: string[][], fontSize: number, startX: number, startY: number, lineHeight: number, gap: number) => {
	context.font = `400 ${fontSize}px ${fontFamily}`;
	context.fillStyle = textColour;
	context.textBaseline = 'top';
	let y = startY;
	points.forEach((lines, pointIndex) => {
		context.fillText('•', startX, y - fontSize * 0.04);
		lines.forEach((line) => {
			context.fillText(line, startX + 44, y);
			y += lineHeight;
		});
		if (pointIndex < points.length - 1) y += gap;
	});
	return y;
};

const renderCanvas = () => {
	if (!previewCanvas.value) return;
	const ctx = previewCanvas.value.getContext('2d');
	if (!ctx) return;

	let actualTitleSize = Number(titleSize.value);
	let actualBulletSize = Number(bulletSize.value);
	let layout = measureLayout(ctx, actualTitleSize, actualBulletSize);
	let attempts = 0;

	while (layout.totalHeight > height && attempts < 160 && (actualTitleSize > 28 || actualBulletSize > 18)) {
		const scale = Math.max(0.92, Math.min(0.985, height / layout.totalHeight));
		actualTitleSize = Math.max(28, actualTitleSize * scale);
		actualBulletSize = Math.max(18, actualBulletSize * scale);
		layout = measureLayout(ctx, actualTitleSize, actualBulletSize);
		attempts += 1;
	}

	ctx.clearRect(0, 0, width, height);
	drawBackground(ctx, width, height, background, Number(cornerRadius.value));
	ctx.save();
	roundedRectPath(ctx, 0, 0, width, height, Number(cornerRadius.value));
	ctx.clip();

	let y = drawTitle(ctx, layout.titleLines, actualTitleSize, padding, padding, layout.titleLineHeight);
	if (layout.titleLines.length && layout.pointLines.length) y += layout.sectionGap;
	drawBulletPoints(ctx, layout.pointLines, actualBulletSize, padding, y, layout.bulletLineHeight, layout.bulletGap);
	ctx.restore();

	const wasScaled = actualTitleSize < Number(titleSize.value) - 0.5 || actualBulletSize < Number(bulletSize.value) - 0.5;
	statusMessage.value = wasScaled
		? `Text automatically scaled to fit (${Math.round(actualTitleSize)} px title, ${Math.round(actualBulletSize)} px bullets).`
		: '';
};

const scheduleRender = () => {
	if (typeof window === 'undefined') return;
	window.cancelAnimationFrame(animationFrame);
	animationFrame = window.requestAnimationFrame(() => {
		renderCanvas();
	});
};

const addBullet = () => {
	if (bullets.value.length >= 8) {
		statusMessage.value = 'A maximum of eight bullet points can be added.';
		return;
	}
	bullets.value.push('');
};

const removeBullet = (index: number) => {
	bullets.value.splice(index, 1);
};

const exportImage = () => {
	if (!previewCanvas.value) return;
	renderCanvas();
	const filename = (title.value || 'product-information').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product-information';
	const exportCanvas = format.value === 'jpeg' ? document.createElement('canvas') : previewCanvas.value;

	if (format.value === 'jpeg') {
		exportCanvas.width = width;
		exportCanvas.height = height;
		const exportContext = exportCanvas.getContext('2d');
		if (!exportContext) return;
		exportContext.fillStyle = '#ffffff';
		exportContext.fillRect(0, 0, width, height);
		exportContext.drawImage(previewCanvas.value, 0, 0);
	}

	const mimeType = format.value === 'jpeg' ? 'image/jpeg' : 'image/png';
	exportCanvas.toBlob((blob) => {
		if (!blob) {
			statusMessage.value = 'The image could not be exported. Please try again.';
			return;
		}
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${filename}.${format.value === 'jpeg' ? 'jpg' : 'png'}`;
		link.click();
		URL.revokeObjectURL(url);
		statusMessage.value = `${format.value.toUpperCase()} exported at ${width} × ${height} pixels.`;
	}, mimeType, 0.94);
};

const copyToClipboard = async () => {
	if (!previewCanvas.value) return;
	renderCanvas();

	if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
		statusMessage.value = 'Clipboard copying is not supported in this browser environment.';
		return;
	}

	try {
		previewCanvas.value.toBlob(async (blob) => {
			if (!blob) {
				statusMessage.value = 'The image could not be copied. Please try again.';
				return;
			}
			try {
				const item = new ClipboardItem({ 'image/png': blob });
				await navigator.clipboard.write([item]);
				statusMessage.value = 'Image copied to clipboard!';
			} catch (err) {
				statusMessage.value = 'Could not copy to clipboard. Use Export instead.';
			}
		}, 'image/png');
	} catch (err) {
		statusMessage.value = 'Could not copy to clipboard. Use Export instead.';
	}
};

const loadFonts = async () => {
	if ('fonts' in document) {
		await Promise.all([
			document.fonts.load('800 96px "Aktiv Grotesk"'),
			document.fonts.load('400 52px "Aktiv Grotesk"'),
			document.fonts.ready,
		]);
	}
};

onMounted(() => {
	loadFonts().finally(scheduleRender);
});

watch([title, titleSize, bullets, bulletSize, cornerRadius, format], scheduleRender, { deep: true });
</script>

<template>
	<section class="product-image-generator" aria-labelledby="image-configurator">
		<div class="generator-layout">
			<section class="preview-panel" aria-labelledby="live-preview">
				<h2 id="live-preview">Live Preview</h2>
				<hr class="heading-hr" />
				<div class="preview-shell">
					<canvas
						ref="previewCanvas"
						width="1400"
						height="980"
						role="img"
						aria-label="Generated product information image preview"
					>
						Your browser does not support the canvas preview.
					</canvas>
				</div>
				<p class="resolution-note">Output resolution: 1400 × 980 pixels. Preview is scaled down to fit your screen.</p>
				<p v-if="statusMessage" class="generator-status" aria-live="polite">{{ statusMessage }}</p>
			</section>

			<form class="configurator" @submit.prevent>
				<div class="configurator-heading">
					<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
						<path d="M4 5.5h16v13H4zM7 8l3.2 3.1L12.5 9l4.5 5H7z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
					</svg>
					<h2 id="image-configurator">Image Configurator</h2>
				</div>
				<hr class="heading-hr" />

				<div class="control-group">
					<label for="product-image-title">Main Title</label>
					<input id="product-image-title" v-model="title" type="text" maxlength="100" />
					<div class="range-row">
						<label for="product-image-title-size">Title Size</label>
						<input id="product-image-title-size" v-model.number="titleSize" type="range" min="48" max="140" />
						<output for="product-image-title-size">{{ titleSize }}</output>
					</div>
				</div>

				<div class="control-group bullets-group">
					<div class="group-heading">
						<span>Bullet Points</span>
						<button class="add-button" type="button" @click="addBullet">+ Add Line</button>
					</div>

					<div class="bullet-inputs">
						<div v-for="(_, index) in bullets" :key="index" class="bullet-input-row">
							<label class="sr-only" :for="`product-image-bullet-${index + 1}`">Bullet point {{ index + 1 }}</label>
							<textarea
								:id="`product-image-bullet-${index + 1}`"
								v-model="bullets[index]"
								maxlength="220"
								rows="2"
								placeholder="Enter a bullet point"
							></textarea>
							<button
								class="remove-button"
								type="button"
								:aria-label="`Remove bullet point ${index + 1}`"
								@click="removeBullet(index)"
							>
								<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="M8 8v10m4-10v10m4-10v10M5 5h14M9 5V3h6v2m3 0-1 16H7L6 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
							</button>
						</div>
					</div>

					<div class="range-row">
						<label for="product-image-bullet-size">Text Size</label>
						<input id="product-image-bullet-size" v-model.number="bulletSize" type="range" min="28" max="80" />
						<output for="product-image-bullet-size">{{ bulletSize }}</output>
					</div>
				</div>

				<div class="control-group image-settings">
					<span class="group-label">Image Settings</span>
					<div class="range-row">
						<label for="product-image-radius">Corner Radius</label>
						<input id="product-image-radius" v-model.number="cornerRadius" type="range" min="0" max="96" />
						<output for="product-image-radius">{{ cornerRadius }}</output>
					</div>
					<div class="select-row">
						<label for="product-image-format">Export Format</label>
						<select id="product-image-format" v-model="format">
							<option value="png">PNG</option>
							<option value="jpeg">JPEG</option>
						</select>
					</div>
				</div>

				<div class="action-buttons">
					<button class="export-button" type="button" @click="exportImage">
						<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 14v6h14v-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
						Export Image
					</button>
					<button class="copy-button" type="button" @click="copyToClipboard">
						<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
							<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
							<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
						</svg>
						Copy to Clipboard
					</button>
				</div>
			</form>
		</div>
	</section>
</template>

<style scoped>
	@font-face {
		font-family: 'Aktiv Grotesk';
		src: url('/fonts/AktivGrotesk-Regular.woff') format('woff');
		font-style: normal;
		font-weight: 400;
		font-display: swap;
	}

	@font-face {
		font-family: 'Aktiv Grotesk';
		src: url('/fonts/AktivGrotesk-Bold.woff') format('woff');
		font-style: normal;
		font-weight: 700;
		font-display: swap;
	}

	@font-face {
		font-family: 'Aktiv Grotesk';
		src: url('/fonts/AktivGrotesk-ExtraBold.woff') format('woff');
		font-style: normal;
		font-weight: 800;
		font-display: swap;
	}

	.product-image-generator {
		--ui-background: #ffffff;
		--ui-foreground: #09090b;
		--ui-muted: #f4f4f5;
		--ui-muted-foreground: #71717a;
		--ui-border: #e4e4e7;
		--ui-primary: #18181b;
		--ui-primary-hover: #27272a;
		--ui-danger: #dc2626;
		font-family: 'Aktiv Grotesk', Arial, sans-serif;
		margin-block: 1.25rem 2rem;
		color: var(--ui-foreground);
	}

	.generator-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: clamp(1.5rem, 3vw, 2.5rem);
		align-items: start;
	}

	.configurator {
		width: min(100%, 44rem);
		margin-inline: auto;
		background: var(--ui-background);
		border: 1px solid var(--ui-border);
		border-radius: 0.75rem;
		box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
		padding: 1.5rem;
	}

	.preview-panel {
		width: min(100%, 44rem);
		margin-inline: auto;
	}

	.configurator-heading {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		margin-bottom: 0.75rem;
	}

	.heading-hr {
		border: 0;
		border-top: 1px solid var(--ui-border);
		margin: 0.75rem 0 1.25rem;
	}

	.configurator-heading svg {
		width: 2rem;
		height: 2rem;
		padding: 0.4rem;
		border-radius: 0.5rem;
		background: var(--ui-muted);
	}

	.configurator-heading h2,
	.preview-panel h2 {
		border: 0;
		margin: 0;
		padding: 0;
		font-family: inherit;
	}

	.configurator-heading h2 {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.control-group {
		border-bottom: 1px solid var(--ui-border);
		padding-bottom: 1.35rem;
		margin-bottom: 1.35rem;
	}

	.control-group > label,
	.group-label,
	.group-heading span {
		display: block;
		font-size: 0.875rem;
		font-weight: 700;
		margin-bottom: 0.7rem;
	}

	.group-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.group-heading span {
		margin-bottom: 0;
	}

	.add-button {
		background: transparent;
		border: 0;
		color: var(--ui-primary);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 700;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		border-radius: 0.35rem;
		transition: background-color 150ms ease;
	}

	.add-button:hover {
		background: var(--ui-muted);
	}

	.bullet-inputs {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.bullet-input-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.5rem;
		align-items: start;
	}

	.remove-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border: 1px solid var(--ui-border);
		background: var(--ui-background);
		color: var(--ui-muted-foreground);
		border-radius: 0.4rem;
		cursor: pointer;
		transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease;
	}

	.remove-button:hover {
		color: var(--ui-danger);
		border-color: var(--ui-danger);
		background: #fef2f2;
	}

	input[type='text'],
	textarea,
	select {
		width: 100%;
		border: 1px solid var(--ui-border);
		border-radius: 0.5rem;
		background: var(--ui-background);
		color: var(--ui-foreground);
		font: inherit;
		font-size: 0.875rem;
		padding: 0.625rem 0.75rem;
		box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}

	textarea {
		resize: vertical;
		line-height: 1.4;
	}

	input:focus-visible,
	textarea:focus-visible,
	select:focus-visible {
		border-color: #a1a1aa;
		outline: 0;
		box-shadow: 0 0 0 3px rgb(24 24 27 / 12%);
	}

	button:focus-visible {
		outline: 2px solid var(--ui-primary);
		outline-offset: 2px;
	}

	.range-row,
	.select-row {
		display: grid;
		grid-template-columns: 6.8rem minmax(0, 1fr) 2rem;
		align-items: center;
		gap: 0.65rem;
		margin-top: 0.85rem;
		font-size: 0.78rem;
		color: var(--ui-muted-foreground);
	}

	.range-row label,
	.select-row label {
		margin: 0;
	}

	.range-row output {
		text-align: right;
		color: var(--ui-foreground);
		font-variant-numeric: tabular-nums;
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--ui-primary);
	}

	.select-row {
		grid-template-columns: 6.8rem 1fr;
	}

	.select-row select {
		padding-block: 0.55rem;
	}

	.image-settings {
		border-bottom: 0;
		margin-bottom: 0.9rem;
		padding-bottom: 0;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0;
	}

	.export-button,
	.copy-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		width: 100%;
		height: 2.75rem;
		box-sizing: border-box;
		border-radius: 0.5rem;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 700;
		padding: 0 1rem;
		box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
		cursor: pointer;
		transition: background-color 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
	}

	.export-button {
		background: var(--ui-primary);
		color: #fff;
		border: 1px solid transparent;
	}

	.export-button:hover {
		background: var(--ui-primary-hover);
		box-shadow: 0 2px 4px rgb(0 0 0 / 12%);
	}

	.copy-button {
		background: var(--ui-background);
		color: var(--ui-foreground);
		border: 1px solid var(--ui-border);
	}

	.copy-button:hover {
		background: var(--ui-muted);
		border-color: #a1a1aa;
		box-shadow: 0 2px 4px rgb(0 0 0 / 6%);
	}

	.preview-panel h2 {
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #6b7485;
		margin: 0 0 0.5rem 0.45rem;
	}

	.preview-shell {
		width: 100%;
		background: #fff;
		filter: drop-shadow(0 10px 24px rgb(15 23 42 / 8%));
	}

	canvas {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1400 / 980;
	}

	.resolution-note,
	.generator-status {
		margin: 1rem 0 0;
		text-align: center;
		font-size: 0.76rem;
		color: #8b96a8;
	}

	.generator-status {
		color: #526074;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 35rem) {
		.configurator {
			padding: 1.1rem;
		}

		.range-row {
			grid-template-columns: 5.5rem minmax(0, 1fr) 1.7rem;
			gap: 0.45rem;
		}
	}
</style>
