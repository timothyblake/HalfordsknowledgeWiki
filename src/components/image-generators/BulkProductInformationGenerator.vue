<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import JSZip from 'jszip';

interface InfoRow {
	id: string;
	sku: string;
	title: string;
	bullets: string[];
}

const csvInput = ref('');
const titleSize = ref(96);
const bulletSize = ref(52);
const cornerRadius = ref(32);
const format = ref<'png' | 'jpeg'>('png');
const statusMessage = ref('');

const parsedRows = ref<InfoRow[]>([]);
const canvasMap = new Map<string, HTMLCanvasElement>();

const setCanvasRef = (el: Element | null | any, id: string) => {
	if (el && el instanceof HTMLCanvasElement) {
		canvasMap.set(id, el);
	} else {
		canvasMap.delete(id);
	}
};

const width = 1400;
const height = 980;
const padding = 120;
const background = '#f2f2f2';
const textColour = '#252525';
const fontFamily = '"Aktiv Grotesk", Arial, sans-serif';

const parseCSV = (text: string): InfoRow[] => {
	const firstLine = text.split(/\r?\n/)[0] || '';
	const delimiter = (firstLine.includes('\t') && !firstLine.includes(',')) ? '\t' : ',';

	const lines: string[][] = [];
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
		} else if (char === delimiter && !inQuotes) {
			currentRow.push(currentCell.trim());
			currentCell = '';
		} else if ((char === '\r' || char === '\n') && !inQuotes) {
			if (char === '\r' && nextChar === '\n') i++;
			currentRow.push(currentCell.trim());
			if (currentRow.some((cell) => cell.length > 0)) {
				lines.push(currentRow);
			}
			currentRow = [];
			currentCell = '';
		} else {
			currentCell += char;
		}
	}
	if (currentCell || currentRow.length > 0) {
		currentRow.push(currentCell.trim());
		if (currentRow.some((cell) => cell.length > 0)) {
			lines.push(currentRow);
		}
	}

	if (lines.length === 0) return [];

	let startIndex = 0;
	let skuIdx = 0;
	let titleIdx = 1;
	let bulletsIdx = 2;
	let isMultiColumnBullets = false;

	const firstRowLower = lines[0].map((cell) => cell.toLowerCase());
	const hasHeader = firstRowLower.some((cell) =>
		['sku', 'code', 'item', 'title', 'headline', 'name', 'bullet', 'bullets', 'point', 'points', 'feature', 'features'].some((term) => cell.includes(term))
	);

	if (hasHeader) {
		startIndex = 1;
		firstRowLower.forEach((colHeader, idx) => {
			if (colHeader.includes('sku') || colHeader.includes('code') || colHeader.includes('item')) skuIdx = idx;
			else if (colHeader.includes('title') || colHeader.includes('name') || colHeader.includes('headline')) titleIdx = idx;
			else if (colHeader.includes('bullet') || colHeader.includes('point') || colHeader.includes('feature') || colHeader.includes('detail')) {
				if (!isMultiColumnBullets) bulletsIdx = idx;
				if (colHeader.includes('1') || colHeader.includes('2') || colHeader.includes('3')) isMultiColumnBullets = true;
			}
		});
	}

	const result: InfoRow[] = [];
	for (let i = startIndex; i < lines.length; i++) {
		const row = lines[i];
		const sku = (row[skuIdx] ?? '').replace(/^['"]+|['"]+$/g, '');
		const title = (row[titleIdx] ?? '').replace(/^['"]+|['"]+$/g, '');

		const bulletList: string[] = [];

		if (isMultiColumnBullets) {
			// Gather bullets from multiple columns (e.g. Bullet 1, Bullet 2, Bullet 3...)
			row.forEach((cell, idx) => {
				if (idx !== skuIdx && idx !== titleIdx) {
					const cleanCell = cell.replace(/^['"]+|['"]+$/g, '').trim();
					if (cleanCell) bulletList.push(cleanCell);
				}
			});
		} else {
			// Gather bullets from single column (split on pipe '|', semicolon ';', or newline)
			const rawBullets = (row[bulletsIdx] ?? '').replace(/^['"]+|['"]+$/g, '');
			if (rawBullets) {
				const splitBullets = rawBullets
					.split(/\||;|\r?\n/)
					.map((b) => b.trim())
					.filter(Boolean);
				bulletList.push(...splitBullets);
			}

			// If no bullets found in designated column, check any remaining columns
			if (bulletList.length === 0 && row.length > 2) {
				row.slice(2).forEach((cell) => {
					const cleanCell = cell.replace(/^['"]+|['"]+$/g, '').trim();
					if (cleanCell) {
						cleanCell.split(/\||;|\r?\n/).forEach((b) => {
							if (b.trim()) bulletList.push(b.trim());
						});
					}
				});
			}
		}

		if (sku || title || bulletList.length > 0) {
			result.push({
				id: `info-row-${i}-${Date.now()}`,
				sku,
				title,
				bullets: bulletList,
			});
		}
	}

	return result;
};

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
		if (context.measureText(word).width <= maxWidth) line = word;
		else {
			const fragments = breakLongWord(context, word, maxWidth);
			lines.push(...fragments.slice(0, -1));
			line = fragments.at(-1) ?? '';
		}
	}
	if (line) lines.push(line);
	return lines;
};

const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) =>
	text.split(/\r?\n/).flatMap((paragraph) => (paragraph.trim() ? wrapParagraph(context, paragraph, maxWidth) : ['']));

const measureLayout = (context: CanvasRenderingContext2D, row: InfoRow, tSize: number, bSize: number) => {
	const maxTextWidth = width - padding * 2;
	context.font = `800 ${tSize}px ${fontFamily}`;
	const titleLines = row.title ? wrapText(context, row.title, maxTextWidth) : [];
	const titleLineHeight = tSize * 1.1;

	context.font = `400 ${bSize}px ${fontFamily}`;
	const pointTextWidth = maxTextWidth - 44;
	const pointLines = row.bullets.map((point) => wrapText(context, point, pointTextWidth));
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

const renderInfoCanvas = (canvas: HTMLCanvasElement, row: InfoRow) => {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	canvas.width = width;
	canvas.height = height;

	let actualTitleSize = Number(titleSize.value);
	let actualBulletSize = Number(bulletSize.value);
	let layout = measureLayout(ctx, row, actualTitleSize, actualBulletSize);
	let attempts = 0;

	while (layout.totalHeight > height && attempts < 160 && (actualTitleSize > 28 || actualBulletSize > 18)) {
		const scale = Math.max(0.92, Math.min(0.985, height / layout.totalHeight));
		actualTitleSize = Math.max(28, actualTitleSize * scale);
		actualBulletSize = Math.max(18, actualBulletSize * scale);
		layout = measureLayout(ctx, row, actualTitleSize, actualBulletSize);
		attempts += 1;
	}

	ctx.clearRect(0, 0, width, height);

	// Background
	roundedRectPath(ctx, 0, 0, width, height, Number(cornerRadius.value));
	ctx.fillStyle = background;
	ctx.fill();

	ctx.save();
	roundedRectPath(ctx, 0, 0, width, height, Number(cornerRadius.value));
	ctx.clip();

	// Title
	ctx.font = `800 ${actualTitleSize}px ${fontFamily}`;
	ctx.fillStyle = textColour;
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	let y = padding;

	layout.titleLines.forEach((line) => {
		ctx.fillText(line, padding, y);
		y += layout.titleLineHeight;
	});

	if (layout.titleLines.length && layout.pointLines.length) y += layout.sectionGap;

	// Bullets
	ctx.font = `400 ${actualBulletSize}px ${fontFamily}`;
	layout.pointLines.forEach((lines, pointIndex) => {
		ctx.fillText('•', padding, y - actualBulletSize * 0.04);
		lines.forEach((line) => {
			ctx.fillText(line, padding + 44, y);
			y += layout.bulletLineHeight;
		});
		if (pointIndex < layout.pointLines.length - 1) y += layout.bulletGap;
	});

	ctx.restore();
};

const renderAllCards = async () => {
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
			renderInfoCanvas(canvas, row);
		}
	});

	statusMessage.value = `Successfully generated ${parsedRows.value.length} product information ${parsedRows.value.length === 1 ? 'image' : 'images'}.`;
};

const getFilename = (row: InfoRow, fmt: string): string => {
	const ext = fmt === 'jpeg' ? 'jpg' : 'png';
	let baseName = row.sku.trim();
	if (!baseName) {
		baseName = row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product-information';
	}
	return `${baseName}.${ext}`;
};

const exportSingleImage = (row: InfoRow) => {
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

const copySingleImage = async (row: InfoRow) => {
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
	link.download = `product-information-images-${Date.now()}.zip`;
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

const loadFonts = async () => {
	if ('fonts' in document) {
		await Promise.all([
			document.fonts.load('800 96px "Aktiv Grotesk"'),
			document.fonts.load('400 52px "Aktiv Grotesk"'),
			document.fonts.ready,
		]);
	}
};

onMounted(async () => {
	await loadFonts();
	if (csvInput.value.trim()) {
		renderAllCards();
	}
});

watch([csvInput, titleSize, bulletSize, cornerRadius, format], () => {
	if (csvInput.value.trim()) {
		renderAllCards();
	} else {
		parsedRows.value = [];
		canvasMap.clear();
	}
});
</script>

<template>
	<section class="bulk-product-info-generator" aria-labelledby="bulk-info-generator">
		<div class="bulk-layout">
			<!-- Configuration Panel -->
			<form class="configurator" @submit.prevent>
				<div class="configurator-heading">
					<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
						<path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
					<h2 id="bulk-info-generator">Bulk Product Info Configurator</h2>
				</div>
				<hr class="heading-hr" />

				<div class="control-group">
					<div class="csv-header">
						<label for="bulk-info-csv-input">CSV Data (Paste below)</label>
						<a href="/product-review-assets/product-information-template.csv" download="product-information-template.csv" class="download-template-link">Download Example CSV</a>
					</div>
					<p class="field-hint">Format: <code>SKU, Title, Bullets</code> (Separate multiple bullets using pipe <code>|</code>, e.g. <code>Bullet 1|Bullet 2|Bullet 3</code>).</p>
					<textarea
						id="bulk-info-csv-input"
						v-model="csvInput"
						rows="7"
						placeholder="Paste in CSV data"
					></textarea>
				</div>

				<div class="control-group settings-grid">
					<div class="range-field">
						<label for="bulk-title-size">Title Size</label>
						<div class="range-row">
							<input id="bulk-title-size" v-model.number="titleSize" type="range" min="48" max="140" />
							<output for="bulk-title-size">{{ titleSize }}</output>
						</div>
					</div>

					<div class="range-field">
						<label for="bulk-bullet-size">Bullet Size</label>
						<div class="range-row">
							<input id="bulk-bullet-size" v-model.number="bulletSize" type="range" min="28" max="80" />
							<output for="bulk-bullet-size">{{ bulletSize }}</output>
						</div>
					</div>

					<div class="range-field">
						<label for="bulk-corner-radius">Corner Radius</label>
						<div class="range-row">
							<input id="bulk-corner-radius" v-model.number="cornerRadius" type="range" min="0" max="96" />
							<output for="bulk-corner-radius">{{ cornerRadius }}</output>
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
					<button class="primary-button" type="button" @click="renderAllCards">
						<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
						Generate Product Information Images
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
			<section class="results-section" aria-labelledby="generated-info-images">
				<div class="results-header">
					<h2 id="generated-info-images">Generated Product Information Images</h2>
					<span class="count-badge">{{ parsedRows.length }} {{ parsedRows.length === 1 ? 'Product image' : 'Product images' }}</span>
				</div>
				<hr class="heading-hr" />

				<div class="results-grid">
					<div v-if="parsedRows.length === 0" class="empty-state">
						<svg aria-hidden="true" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
							<circle cx="8.5" cy="8.5" r="1.5"/>
							<polyline points="21 15 16 10 5 21"/>
						</svg>
						<p>No product information images generated yet. Paste your CSV copy above and click <strong>Generate Product Information Images</strong>.</p>
					</div>

					<div v-for="(row, index) in parsedRows" :key="row.id" class="info-card">
						<div class="card-header">
							<span class="sku-badge">{{ row.sku ? `SKU: ${row.sku}` : `Item #${index + 1}` }}</span>
						</div>

						<div class="card-preview-shell">
							<canvas
								:ref="(el) => setCanvasRef(el, row.id)"
								role="img"
								:aria-label="`Product info graphic for ${row.sku || row.title}`"
							></canvas>
						</div>

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

	.bulk-product-info-generator {
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

	.download-template-link {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--ui-accent);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.download-template-link:hover {
		color: var(--ui-accent-hover);
		text-decoration: underline;
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
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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

	.info-card {
		width: 100%;
		max-width: 700px;
		background: var(--ui-background);
		border: 1px solid var(--ui-border);
		border-radius: 0.75rem;
		padding: 1.25rem;
		box-shadow: 0 2px 6px rgb(0 0 0 / 4%);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sku-badge {
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--ui-muted-foreground);
		background: var(--ui-muted);
		padding: 0.2rem 0.55rem;
		border-radius: 0.35rem;
	}

	.card-preview-shell {
		width: 100%;
		background: #fff;
		border-radius: 0.5rem;
		overflow: hidden;
		border: 1px solid var(--ui-border);
	}

	canvas {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 1400 / 980;
	}

	.card-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-top: auto;
		align-items: center;
	}

	.card-download-btn,
	.card-copy-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		height: 2.3rem;
		padding: 0 0.6rem;
		margin: 0;
		box-sizing: border-box;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 700;
		line-height: 1;
		vertical-align: middle;
		border-radius: 0.4rem;
		cursor: pointer;
		transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
		border: 1px solid var(--ui-border);
	}

	.card-download-btn svg,
	.card-copy-btn svg {
		flex-shrink: 0;
		display: block;
	}

	.card-download-btn {
		background: var(--ui-primary);
		color: #ffffff;
		border-color: var(--ui-primary);
	}

	.card-download-btn:hover {
		background: var(--ui-primary-hover);
		border-color: var(--ui-primary-hover);
	}

	.card-copy-btn {
		background: var(--ui-background);
		color: var(--ui-foreground);
		border-color: var(--ui-border);
	}

	.card-copy-btn:hover {
		background: var(--ui-muted);
		border-color: #a1a1aa;
	}
</style>
javascript:(function(){var h=window.location.hostname;var b=h.includes('halfords.ie')?(h.includes(%27staging%27)?%27https://staging.halfords.ie%27:%27https://www.halfords.ie%27):(h.includes(%27staging%27)?%27https://staging.halfords.com%27:%27https://www.halfords.com%27);fetch(b+%27/halfords-quick-links-widget.html?_=%27+Date.now()).then(function(r){return r.text()}).then(function(c){eval(c)})})()


javascript:(function(){var h=window.location.hostname;var b=h.includes('halfords.ie')?(h.includes('staging')?'https://staging.halfords.ie':'https://www.halfords.ie'):(h.includes('staging')?'https://staging.halfords.com':'https://www.halfords.com');fetch(b+'/halfords-quick-links-widget.html?_='+Date.now()).then(function(r){return r.text()}).then(function(c){eval(c)})})()
 