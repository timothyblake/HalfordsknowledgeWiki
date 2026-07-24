<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import JSZip from 'jszip';

type ReviewRow = {
	id: string;
	sku: string;
	title: string;
	review: string;
};

const csvInput = ref('');
const titleSize = ref(76);
const reviewSize = ref(76);
const format = ref<'png' | 'jpeg'>('png');
const statusMessage = ref('');

const parsedRows = ref<ReviewRow[]>([]);
const canvasMap = new Map<string, HTMLCanvasElement>();

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

const setCanvasRef = (el: any, rowId: string) => {
	if (el && el instanceof HTMLCanvasElement) {
		canvasMap.set(rowId, el);
	}
};

const parseCSV = (text: string): ReviewRow[] => {
	const rows: string[][] = [];
	let currentRow: string[] = [];
	let currentCell = '';
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		const nextChar = text[i + 1];

		if (char === '"') {
			if (inQuotes && nextChar === '"') {
				currentCell += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if ((char === ',' || char === '\t') && !inQuotes) {
			currentRow.push(currentCell.trim());
			currentCell = '';
		} else if ((char === '\r' || char === '\n') && !inQuotes) {
			if (char === '\r' && nextChar === '\n') i++;
			currentRow.push(currentCell.trim());
			if (currentRow.some((cell) => cell.length > 0)) {
				rows.push(currentRow);
			}
			currentRow = [];
			currentCell = '';
		} else {
			currentCell += char;
		}
	}
	if (currentCell.length > 0 || currentRow.length > 0) {
		currentRow.push(currentCell.trim());
		if (currentRow.some((cell) => cell.length > 0)) {
			rows.push(currentRow);
		}
	}

	if (rows.length === 0) return [];

	let startIndex = 0;
	let skuIdx = 0;
	let titleIdx = 1;
	let reviewIdx = 2;

	const firstRowLower = rows[0].map((cell) => cell.toLowerCase());
	const hasHeader = firstRowLower.some((cell) =>
		['sku', 'product', 'title', 'headline', 'review', 'message', 'text', 'copy'].some((term) => cell.includes(term))
	);

	if (hasHeader) {
		startIndex = 1;
		firstRowLower.forEach((colHeader, idx) => {
			if (colHeader.includes('sku') || colHeader.includes('product') || colHeader.includes('code')) skuIdx = idx;
			else if (colHeader.includes('title') || colHeader.includes('head') || colHeader.includes('subject')) titleIdx = idx;
			else if (colHeader.includes('review') || colHeader.includes('text') || colHeader.includes('copy') || colHeader.includes('message') || colHeader.includes('comment')) reviewIdx = idx;
		});
	}

	const result: ReviewRow[] = [];
	for (let i = startIndex; i < rows.length; i++) {
		const row = rows[i];
		const sku = row[skuIdx] ?? '';
		const title = row[titleIdx] ?? '';
		const review = row[reviewIdx] ?? '';

		if (sku || title || review) {
			result.push({
				id: `row-${i}-${Date.now()}`,
				sku: sku.replace(/^['"]+|['"]+$/g, ''),
				title: title.replace(/^['"]+|['"]+$/g, ''),
				review: review.replace(/^['"]+|['"]+$/g, ''),
			});
		}
	}

	return result;
};

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

const renderReviewCanvas = (canvas: HTMLCanvasElement, row: ReviewRow) => {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	canvas.width = width;
	canvas.height = height;

	ctx.clearRect(0, 0, width, height);
	drawSpeechBubble(ctx);
	if (assetsReady) {
		ctx.drawImage(starsImage, 580, 185, 1000, 181);
		ctx.drawImage(startQuoteImage, 95, 620, 160, 130);
		ctx.drawImage(endQuoteImage, width - 255, 950, 160, 130);
	}

	let currentTitleSize = Number(titleSize.value);
	ctx.font = `800 ${currentTitleSize}px ${fontFamily}`;
	while (ctx.measureText(row.title).width > 1600 && currentTitleSize > 48) {
		currentTitleSize -= 2;
		ctx.font = `800 ${currentTitleSize}px ${fontFamily}`;
	}
	ctx.fillStyle = textColour;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	ctx.fillText(row.title, width / 2, 500);

	let currentReviewSize = Number(reviewSize.value);
	let lineHeight = currentReviewSize * 1.28;
	ctx.font = `400 ${currentReviewSize}px ${fontFamily}`;
	let reviewLines = row.review ? wrapText(ctx, row.review, 1560) : [];
	while (reviewLines.length * lineHeight > 430 && currentReviewSize > 38) {
		currentReviewSize -= 2;
		lineHeight = currentReviewSize * 1.28;
		ctx.font = `400 ${currentReviewSize}px ${fontFamily}`;
		reviewLines = wrapText(ctx, row.review, 1560);
	}

	const reviewHeight = reviewLines.length * lineHeight;
	const reviewY = 740 + Math.max(0, (310 - reviewHeight) / 2);
	ctx.fillStyle = textColour;
	ctx.font = `400 ${currentReviewSize}px ${fontFamily}`;
	drawCentredLines(ctx, reviewLines, reviewY, lineHeight);
};

const renderAllReviews = async () => {
	if (!assetsReady) {
		statusMessage.value = 'Artwork assets are still loading. Please wait a moment.';
		return;
	}

	const rawCSV = csvInput.value.trim();
	if (!rawCSV) {
		statusMessage.value = 'Please paste CSV data into the text box above.';
		return;
	}

	const rows = parseCSV(rawCSV);
	if (rows.length === 0) {
		statusMessage.value = 'No valid rows found in the CSV. Make sure data is comma-separated.';
		return;
	}

	parsedRows.value = rows;
	canvasMap.clear();

	await nextTick();

	parsedRows.value.forEach((row) => {
		const canvas = canvasMap.get(row.id);
		if (canvas) {
			renderReviewCanvas(canvas, row);
		}
	});

	statusMessage.value = `Successfully generated ${parsedRows.value.length} review image ${parsedRows.value.length === 1 ? 'graphic' : 'graphics'}.`;
};

const getFilename = (row: ReviewRow, fmt: string): string => {
	const ext = fmt === 'jpeg' ? 'jpg' : 'png';
	let baseName = row.sku.trim();
	if (!baseName) {
		baseName = row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product-review';
	}
	return `${baseName}.${ext}`;
};

const exportSingleImage = (row: ReviewRow) => {
	const sourceCanvas = canvasMap.get(row.id);
	if (!sourceCanvas) return;

	const filename = getFilename(row, format.value);
	const mimeType = format.value === 'jpeg' ? 'image/jpeg' : 'image/png';

	let exportCanvas = sourceCanvas;
	if (format.value === 'jpeg') {
		exportCanvas = document.createElement('canvas');
		exportCanvas.width = width;
		exportCanvas.height = height;
		const ctx = exportCanvas.getContext('2d');
		if (ctx) {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);
			ctx.drawImage(sourceCanvas, 0, 0);
		}
	}

	exportCanvas.toBlob((blob) => {
		if (!blob) {
			statusMessage.value = 'Could not export image blob.';
			return;
		}
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
		statusMessage.value = `Downloaded ${filename}`;
	}, mimeType, 0.94);
};

const copySingleImage = async (row: ReviewRow) => {
	const sourceCanvas = canvasMap.get(row.id);
	if (!sourceCanvas) return;

	if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
		statusMessage.value = 'Clipboard copying is not supported in this browser environment.';
		return;
	}

	try {
		sourceCanvas.toBlob(async (blob) => {
			if (!blob) {
				statusMessage.value = 'Could not create image blob for copy.';
				return;
			}
			try {
				const item = new ClipboardItem({ 'image/png': blob });
				await navigator.clipboard.write([item]);
				statusMessage.value = 'Image copied to clipboard!';
			} catch (err) {
				statusMessage.value = 'Could not copy to clipboard. Use Download instead.';
			}
		}, 'image/png');
	} catch (err) {
		statusMessage.value = 'Could not copy to clipboard. Use Download instead.';
	}
};

const isExportingZip = ref(false);

const exportAllAsZip = async () => {
	if (parsedRows.value.length === 0 || canvasMap.size === 0) {
		statusMessage.value = 'No generated images available to export.';
		return;
	}

	statusMessage.value = 'Generating ZIP archive... Please wait.';
	isExportingZip.value = true;

	const zip = new JSZip();
	const mimeType = format.value === 'jpeg' ? 'image/jpeg' : 'image/png';
	const usedFilenames = new Set<string>();

	const blobPromises = parsedRows.value.map((row) => {
		const itemCanvas = canvasMap.get(row.id);
		if (!itemCanvas) return Promise.resolve();

		let finalCanvas = itemCanvas;
		if (format.value === 'jpeg') {
			finalCanvas = document.createElement('canvas');
			finalCanvas.width = width;
			finalCanvas.height = height;
			const ctx = finalCanvas.getContext('2d');
			if (ctx) {
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(0, 0, width, height);
				ctx.drawImage(itemCanvas, 0, 0);
			}
		}

		return new Promise<void>((resolve) => {
			finalCanvas.toBlob((blob) => {
				if (blob) {
					let filename = getFilename(row, format.value);
					let counter = 1;
					const base = filename.replace(/\.[^/.]+$/, '');
					const ext = filename.split('.').pop();
					while (usedFilenames.has(filename)) {
						filename = `${base}-${counter}.${ext}`;
						counter++;
					}
					usedFilenames.add(filename);
					zip.file(filename, blob);
				}
				resolve();
			}, mimeType, 0.94);
		});
	});

	await Promise.all(blobPromises);

	const content = await zip.generateAsync({ type: 'blob' });
	const url = URL.createObjectURL(content);
	const link = document.createElement('a');
	link.href = url;
	link.download = `product-review-images-${Date.now()}.zip`;
	link.click();
	URL.revokeObjectURL(url);

	isExportingZip.value = false;
	statusMessage.value = `ZIP archive containing ${parsedRows.value.length} images downloaded!`;
};

const clearInput = () => {
	csvInput.value = '';
	parsedRows.value = [];
	canvasMap.clear();
	statusMessage.value = 'Input cleared.';
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
		if (csvInput.value.trim()) {
			renderAllReviews();
		}
	} catch (e) {
		statusMessage.value = 'Artwork assets could not be loaded. Please refresh the page.';
	}
});

watch([titleSize, reviewSize, format], () => {
	if (parsedRows.value.length > 0) {
		renderAllReviews();
	}
});
</script>

<template>
	<section class="bulk-product-review-generator" aria-labelledby="bulk-generator">
		<div class="bulk-layout">
			<!-- Configuration Panel -->
			<form class="configurator" @submit.prevent>
				<div class="configurator-heading">
					<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
						<path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
					<h2 id="bulk-generator">Bulk Review Image Configurator</h2>
				</div>
				<hr class="heading-hr" />

				<div class="control-group">
					<div class="csv-header">
						<label for="bulk-csv-input">CSV Data (Paste below)</label>
					</div>
					<p class="field-hint">Format: <code>SKU, Review Title, Review Text</code> (Headers are auto-detected, quotes & multi-line values supported).</p>
					<textarea
						id="bulk-csv-input"
						v-model="csvInput"
						rows="7"
						placeholder="Paste in CSV data"
					></textarea>
				</div>

				<div class="control-group settings-grid">
					<div class="range-field">
						<label for="bulk-title-size">Title Size</label>
						<div class="range-row">
							<input id="bulk-title-size" v-model.number="titleSize" type="range" min="56" max="130" />
							<output for="bulk-title-size">{{ titleSize }}</output>
						</div>
					</div>

					<div class="range-field">
						<label for="bulk-review-size">Text Size</label>
						<div class="range-row">
							<input id="bulk-review-size" v-model.number="reviewSize" type="range" min="40" max="105" />
							<output for="bulk-review-size">{{ reviewSize }}</output>
						</div>
					</div>

					<div class="select-field">
						<label for="bulk-export-format">Export Format</label>
						<select id="bulk-export-format" v-model="format">
							<option value="png">PNG</option>
							<option value="jpeg">JPEG</option>
						</select>
					</div>
				</div>

				<div class="action-bar">
					<button class="primary-button" type="button" @click="renderAllReviews">
						<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
						Generate Review Images
					</button>

					<button class="zip-button" type="button" :disabled="parsedRows.length === 0 || isExportingZip" @click="exportAllAsZip">
						<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
						Export All as ZIP
					</button>

					<button class="secondary-button" type="button" @click="clearInput">
						Clear Input
					</button>
				</div>

				<p v-if="statusMessage" class="generator-status" aria-live="polite">{{ statusMessage }}</p>
			</form>

			<!-- Generated Items Container -->
			<section class="results-section" aria-labelledby="generated-reviews">
				<div class="results-header">
					<h2 id="generated-reviews">Generated Review Images</h2>
					<span class="count-badge">{{ parsedRows.length }} {{ parsedRows.length === 1 ? 'item' : 'items' }}</span>
				</div>
				<hr class="heading-hr" />

				<div class="results-grid">
					<div v-if="parsedRows.length === 0" class="empty-state">
						<svg aria-hidden="true" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
							<circle cx="8.5" cy="8.5" r="1.5"/>
							<polyline points="21 15 16 10 5 21"/>
						</svg>
						<p>No review images generated yet. Paste your CSV copy above and click <strong>Generate Review Images</strong>.</p>
					</div>

					<div v-for="(row, index) in parsedRows" :key="row.id" class="review-card">
						<div class="card-header">
							<span class="sku-badge">{{ row.sku ? `SKU: ${row.sku}` : `Item #${index + 1}` }}</span>
						</div>

						<div class="card-preview-shell">
							<canvas
								:ref="(el) => setCanvasRef(el, row.id)"
								role="img"
								:aria-label="`Review graphic for ${row.sku || row.title}`"
							></canvas>
						</div>

						<p class="card-snippet">{{ row.review || '(No review message)' }}</p>

						<div class="card-actions">
							<button type="button" class="card-download-btn" @click="exportSingleImage(row)">
								<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 14v6h14v-6"/></svg>
								Download {{ format.toUpperCase() }}
							</button>
							<button type="button" class="card-copy-btn" @click="copySingleImage(row)">
								<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
								Copy
							</button>
						</div>
					</div>
				</div>
			</section>
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

	.bulk-product-review-generator {
		--ui-background: #ffffff;
		--ui-foreground: #09090b;
		--ui-muted: #f4f4f5;
		--ui-muted-foreground: #71717a;
		--ui-border: #e4e4e7;
		--ui-primary: #18181b;
		--ui-primary-hover: #27272a;
		--ui-accent: #2563eb;
		--ui-accent-hover: #1d4ed8;
		font-family: 'Aktiv Grotesk', Arial, sans-serif;
		margin-block: 1.25rem 2rem;
		color: var(--ui-foreground);
	}

	.bulk-layout {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.configurator {
		background: var(--ui-background);
		border: 1px solid var(--ui-border);
		border-radius: 0.75rem;
		box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
		padding: 1.5rem;
	}

	.configurator-heading {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.configurator-heading svg {
		padding: 0.35rem;
		border-radius: 0.5rem;
		background: var(--ui-muted);
	}

	.configurator-heading h2,
	.results-header h2 {
		border: 0;
		margin: 0;
		padding: 0;
		font-family: inherit;
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.heading-hr {
		border: 0;
		border-top: 1px solid var(--ui-border);
		margin: 0.75rem 0 1.25rem;
	}

	.control-group {
		margin-bottom: 1.25rem;
	}

	.csv-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}

	.csv-header label {
		font-size: 0.875rem;
		font-weight: 700;
	}

	.field-hint {
		font-size: 0.78rem;
		color: var(--ui-muted-foreground);
		margin: 0 0 0.5rem;
	}

	.field-hint code {
		background: var(--ui-muted);
		padding: 0.15rem 0.35rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
	}

	textarea {
		width: 100%;
		border: 1px solid var(--ui-border);
		border-radius: 0.5rem;
		background: var(--ui-background);
		color: var(--ui-foreground);
		font-family: monospace;
		font-size: 0.82rem;
		padding: 0.75rem;
		box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
		resize: vertical;
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}

	textarea:focus-visible,
	select:focus-visible,
	input:focus-visible {
		border-color: #a1a1aa;
		outline: 0;
		box-shadow: 0 0 0 3px rgb(24 24 27 / 12%);
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.25rem;
		background: var(--ui-muted);
		padding: 1rem;
		border-radius: 0.5rem;
		align-items: center;
	}

	.range-field label,
	.select-field label {
		display: block;
		font-size: 0.78rem;
		font-weight: 700;
		margin-bottom: 0.35rem;
		color: var(--ui-muted-foreground);
	}

	.range-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 2.2rem;
		align-items: center;
		gap: 0.5rem;
	}

	.range-row output {
		font-size: 0.78rem;
		text-align: right;
		font-weight: 600;
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--ui-primary);
	}

	select {
		width: 100%;
		border: 1px solid var(--ui-border);
		border-radius: 0.4rem;
		background: var(--ui-background);
		color: var(--ui-foreground);
		padding: 0.4rem 0.6rem;
		font-size: 0.82rem;
	}

	.action-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1.25rem;
	}

	.primary-button,
	.zip-button,
	.secondary-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		height: 2.6rem;
		padding: 0 1.1rem;
		border-radius: 0.5rem;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 700;
		line-height: 1;
		margin: 0;
		box-sizing: border-box;
		vertical-align: middle;
		cursor: pointer;
		transition: background-color 150ms ease, opacity 150ms ease;
		border: 1px solid transparent;
	}

	.primary-button svg,
	.zip-button svg,
	.secondary-button svg {
		display: block;
		flex-shrink: 0;
	}

	.primary-button {
		background: var(--ui-primary);
		color: #ffffff;
	}

	.primary-button:hover {
		background: var(--ui-primary-hover);
	}

	.zip-button {
		background: var(--ui-accent);
		color: #ffffff;
	}

	.zip-button:hover:not(:disabled) {
		background: var(--ui-accent-hover);
	}

	.zip-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.secondary-button {
		background: var(--ui-background);
		color: var(--ui-foreground);
		border-color: var(--ui-border);
	}

	.secondary-button:hover {
		background: var(--ui-muted);
	}

	.generator-status {
		margin: 0.85rem 0 0;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--ui-muted-foreground);
	}

	/* Results Section */
	.results-section {
		background: var(--ui-background);
		border: 1px solid var(--ui-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
	}

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.count-badge {
		font-size: 0.75rem;
		font-weight: 700;
		background: var(--ui-muted);
		color: var(--ui-muted-foreground);
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
	}

	.results-grid {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.empty-state {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		text-align: center;
		color: var(--ui-muted-foreground);
	}

	.empty-state svg {
		margin-bottom: 0.75rem;
		opacity: 0.6;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.9rem;
	}

	.review-card {
		width: min(100%, 44rem);
		box-sizing: border-box;
		border: 1px solid var(--ui-border);
		border-radius: 0.6rem;
		background: #ffffff;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.sku-badge {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		background: #000;
		color: #fff;
		padding: 0.2rem 0.45rem;
		border-radius: 0.25rem;
		white-space: nowrap;
	}

	.card-preview-shell {
		width: 100%;
		border-radius: 0.35rem;
		overflow: hidden;
		box-shadow: 0 4px 12px rgb(0 0 0 / 6%);
		background: #f2f2f2;
	}

	.card-preview-shell canvas {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 216 / 154;
	}

	.card-snippet {
		font-size: 0.78rem;
		color: var(--ui-muted-foreground);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.35;
	}

	.card-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-top: auto;
		align-items: center;
	}

	.card-download-btn,
	.card-copy-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		height: 2.2rem;
		border-radius: 0.4rem;
		font: inherit;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1;
		margin: 0;
		box-sizing: border-box;
		cursor: pointer;
		transition: background-color 150ms ease;
	}

	.card-download-btn {
		background: var(--ui-primary);
		color: #ffffff;
		border: 1px solid transparent;
	}

	.card-download-btn:hover {
		background: var(--ui-primary-hover);
	}

	.card-copy-btn {
		background: var(--ui-background);
		color: var(--ui-foreground);
		border: 1px solid var(--ui-border);
	}

	.card-copy-btn:hover {
		background: var(--ui-muted);
	}
</style>
