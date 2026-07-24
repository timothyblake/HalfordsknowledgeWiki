<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

const title = ref('Quality product');
const review = ref('A well thought out socket and spanner set. Pretty much all I need for DIY auto work. Good value for money.');
const titleSize = ref(76);
const reviewSize = ref(76);
const format = ref<'png' | 'jpeg'>('png');
const statusMessage = ref('');

const previewCanvas = ref<HTMLCanvasElement | null>(null);

const width = 2160;
const height = 1540;
const bubbleBottom = 1350;
const bubbleColour = '#f2f2f2';
const textColour = '#252525';
const fontFamily = '"Aktiv Grotesk", Arial, sans-serif';

let starsImage: HTMLImageElement;
let startQuoteImage: HTMLImageElement;
let endQuoteImage: HTMLImageElement;
let assetsReady = false;
let animationFrame = 0;

const drawSpeechBubble = (context: CanvasRenderingContext2D) => {
	const radius = 82;
	const tailStart = 178;
	const tailEnd = 345;
	context.beginPath();
	context.moveTo(radius, 0);
	context.lineTo(width - radius, 0);
	context.quadraticCurveTo(width, 0, width, radius);
	context.lineTo(width, bubbleBottom - radius);
	context.quadraticCurveTo(width, bubbleBottom, width - radius, bubbleBottom);
	context.lineTo(tailEnd, bubbleBottom);
	context.lineTo(tailStart, height);
	context.lineTo(tailStart, bubbleBottom);
	context.lineTo(radius, bubbleBottom);
	context.quadraticCurveTo(0, bubbleBottom, 0, bubbleBottom - radius);
	context.lineTo(0, radius);
	context.quadraticCurveTo(0, 0, radius, 0);
	context.closePath();
	context.fillStyle = bubbleColour;
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
		} else fragment = candidate;
	}
	if (fragment) fragments.push(fragment);
	return fragments;
};

const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
	const lines: string[] = [];
	for (const paragraph of text.split(/\r?\n/)) {
		const words = paragraph.trim().split(/\s+/).filter(Boolean);
		let line = '';
		for (const word of words) {
			const candidate = line ? `${line} ${word}` : word;
			if (context.measureText(candidate).width <= maxWidth) {
				line = candidate;
				continue;
			}
			if (line) lines.push(line);
			line = '';
			if (context.measureText(word).width <= maxWidth) line = word;
			else {
				const fragments = breakLongWord(context, word, maxWidth);
				lines.push(...fragments.slice(0, -1));
				line = fragments.at(-1) ?? '';
			}
		}
		if (line) lines.push(line);
		if (!paragraph.trim()) lines.push('');
	}
	return lines;
};

const drawCentredLines = (context: CanvasRenderingContext2D, lines: string[], startY: number, lineHeight: number) => {
	context.textAlign = 'center';
	context.textBaseline = 'top';
	lines.forEach((line, index) => context.fillText(line, width / 2, startY + index * lineHeight));
};

const renderCanvas = () => {
	if (!previewCanvas.value) return;
	const ctx = previewCanvas.value.getContext('2d');
	if (!ctx) return;

	ctx.clearRect(0, 0, width, height);
	drawSpeechBubble(ctx);
	if (assetsReady) {
		ctx.drawImage(starsImage, 580, 185, 1000, 181);
		ctx.drawImage(startQuoteImage, 95, 620, 160, 130);
		ctx.drawImage(endQuoteImage, width - 255, 950, 160, 130);
	}

	let currentTitleSize = Number(titleSize.value);
	ctx.font = `800 ${currentTitleSize}px ${fontFamily}`;
	while (ctx.measureText(title.value).width > 1600 && currentTitleSize > 48) {
		currentTitleSize -= 2;
		ctx.font = `800 ${currentTitleSize}px ${fontFamily}`;
	}
	ctx.fillStyle = textColour;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	ctx.fillText(title.value, width / 2, 500);

	let currentReviewSize = Number(reviewSize.value);
	let lineHeight = currentReviewSize * 1.28;
	ctx.font = `400 ${currentReviewSize}px ${fontFamily}`;
	let reviewLines = review.value ? wrapText(ctx, review.value, 1560) : [];
	while (reviewLines.length * lineHeight > 430 && currentReviewSize > 38) {
		currentReviewSize -= 2;
		lineHeight = currentReviewSize * 1.28;
		ctx.font = `400 ${currentReviewSize}px ${fontFamily}`;
		reviewLines = wrapText(ctx, review.value, 1560);
	}

	const reviewHeight = reviewLines.length * lineHeight;
	const reviewY = 740 + Math.max(0, (310 - reviewHeight) / 2);
	ctx.fillStyle = textColour;
	ctx.font = `400 ${currentReviewSize}px ${fontFamily}`;
	drawCentredLines(ctx, reviewLines, reviewY, lineHeight);

	const scaled = currentTitleSize < Number(titleSize.value) || currentReviewSize < Number(reviewSize.value);
	statusMessage.value = scaled ? 'Text was automatically scaled to fit the image.' : '';
};

const scheduleRender = () => {
	if (typeof window === 'undefined') return;
	window.cancelAnimationFrame(animationFrame);
	animationFrame = window.requestAnimationFrame(() => {
		renderCanvas();
	});
};

const exportImage = () => {
	if (!assetsReady || !previewCanvas.value) {
		statusMessage.value = 'The artwork is still loading. Please try again in a moment.';
		return;
	}
	renderCanvas();
	const filename = (title.value || 'product-review').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product-review';
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
	if (!assetsReady || !previewCanvas.value) {
		statusMessage.value = 'The artwork is still loading. Please try again in a moment.';
		return;
	}
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

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
	const img = new Image();
	img.addEventListener('load', () => resolve(img), { once: true });
	img.addEventListener('error', () => reject(new Error(`Could not load ${source}`)), { once: true });
	img.src = source;
});

const loadFonts = async () => {
	if ('fonts' in document) {
		await Promise.all([
			document.fonts.load('800 76px "Aktiv Grotesk"'),
			document.fonts.load('400 76px "Aktiv Grotesk"'),
			document.fonts.ready,
		]);
	}
};

onMounted(async () => {
	try {
		const [_, stars, startQ, endQ] = await Promise.all([
			loadFonts(),
			loadImage('/product-review-assets/stars.svg'),
			loadImage('/product-review-assets/speech-marks-start.svg'),
			loadImage('/product-review-assets/speech-marks-end.svg'),
		]);
		starsImage = stars;
		startQuoteImage = startQ;
		endQuoteImage = endQ;
		assetsReady = true;
	} catch (e) {
		statusMessage.value = 'The review artwork could not be loaded. Please refresh the page.';
	} finally {
		scheduleRender();
	}
});

watch([title, review, titleSize, reviewSize, format], scheduleRender);
</script>

<template>
	<section class="product-review-generator" aria-labelledby="product-review-image">
		<div class="generator-layout">
			<section class="preview-panel" aria-labelledby="live-preview">
				<h2 id="live-preview">Live Preview</h2>
				<hr class="heading-hr" />
				<div class="preview-shell">
					<canvas
						ref="previewCanvas"
						width="2160"
						height="1540"
						role="img"
						aria-label="Generated five-star product review image preview"
					>
						Your browser does not support the canvas preview.
					</canvas>
				</div>
				<p class="resolution-note">Output resolution: 2160 × 1540 pixels. Preview is scaled down to fit your screen.</p>
				<p v-if="statusMessage" class="generator-status" aria-live="polite">{{ statusMessage }}</p>
			</section>

			<form class="configurator" @submit.prevent>
				<div class="configurator-heading">
					<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
						<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
					</svg>
					<h2 id="product-review-image">Product Review Image</h2>
				</div>
				<hr class="heading-hr" />

				<div class="control-group">
					<label for="review-image-title">Review Title</label>
					<input id="review-image-title" v-model="title" type="text" maxlength="100" />
					<div class="range-row">
						<label for="review-image-title-size">Title Size</label>
						<input id="review-image-title-size" v-model.number="titleSize" type="range" min="56" max="130" />
						<output for="review-image-title-size">{{ titleSize }}</output>
					</div>
				</div>

				<div class="control-group">
					<label for="review-image-copy">Review Text</label>
					<textarea id="review-image-copy" v-model="review" maxlength="600" rows="5"></textarea>
					<div class="range-row">
						<label for="review-image-copy-size">Text Size</label>
						<input id="review-image-copy-size" v-model.number="reviewSize" type="range" min="40" max="105" />
						<output for="review-image-copy-size">{{ reviewSize }}</output>
					</div>
				</div>

				<div class="control-group image-settings">
					<span class="group-label">Image Settings</span>
					<p class="fixed-rating"><span aria-hidden="true">★★★★★</span> Every image uses a fixed five-star rating.</p>
					<div class="select-row">
						<label for="review-image-format">Export Format</label>
						<select id="review-image-format" v-model="format">
							<option value="png">PNG</option>
							<option value="jpeg">JPEG</option>
						</select>
					</div>
				</div>

				<div class="action-buttons">
					<button class="export-button" type="button" @click="exportImage">
						<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 14v6h14v-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
						Export Review Image
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

	.product-review-generator {
		--ui-background: #ffffff;
		--ui-foreground: #09090b;
		--ui-muted: #f4f4f5;
		--ui-muted-foreground: #71717a;
		--ui-border: #e4e4e7;
		--ui-primary: #18181b;
		--ui-primary-hover: #27272a;
		font-family: 'Aktiv Grotesk', Arial, sans-serif;
		margin-block: 1.25rem 2rem;
		color: var(--ui-foreground);
	}

	.generator-layout {
		display: grid;
		gap: clamp(1.5rem, 3vw, 2.5rem);
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
	.group-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 700;
		margin-bottom: 0.7rem;
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
		min-height: 7rem;
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
		grid-template-columns: 4.2rem minmax(0, 1fr) 2rem;
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
		grid-template-columns: 5.8rem 1fr;
	}

	.select-row select {
		padding-block: 0.55rem;
	}

	.fixed-rating {
		margin: 0 0 1rem;
		font-size: 0.86rem;
		color: var(--ui-muted-foreground);
		background: var(--ui-muted);
		border-radius: 0.5rem;
		padding: 0.65rem 0.75rem;
	}

	.fixed-rating span {
		color: #ffb400;
		letter-spacing: 0.08em;
		margin-right: 0.35rem;
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
		aspect-ratio: 216 / 154;
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

	@media (max-width: 35rem) {
		.configurator {
			padding: 1.1rem;
		}

		.range-row {
			grid-template-columns: 4rem minmax(0, 1fr) 1.7rem;
			gap: 0.45rem;
		}
	}
</style>
