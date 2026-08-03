<script setup lang="ts">
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-800.css';
import '@fontsource/montserrat/latin-900.css';
import { nextTick, onMounted, ref, watch } from 'vue';

type OutputId = 'desktop' | 'tablet' | 'mobile';
type ExportFormat = 'png' | 'jpeg';

type OutputSpec = {
	id: OutputId;
	label: string;
	width: number;
	height: number;
	layout: 'safe-wide' | 'portrait' | 'landscape';
};

type Layout = {
	contentX: number;
	contentWidth: number;
	headerX: number;
	headerY: number;
	headerWidth: number;
	headerHeight: number;
	headerSize: number;
	prefixY: number;
	prefixSize: number;
	offerY: number;
	offerSize: number;
	offerLineHeight: number;
	offerLines: boolean;
	subheadingY: number;
	subheadingSize: number;
	secondaryY: number;
	secondarySize: number;
	promoY: number;
	promoGap: number;
	promoSize: number;
	ctaX: number;
	ctaY: number;
	ctaWidth: number;
	ctaHeight: number;
	ctaSize: number;
	brandsX: number;
	brandsY: number;
	brandsWidth: number;
	brandsHeight: number;
	termsX: number;
	termsY: number;
	termsWidth: number;
	termsSize: number;
};

const outputs: OutputSpec[] = [
	{ id: 'desktop', label: 'Desktop', width: 768, height: 380, layout: 'safe-wide' },
	{ id: 'tablet', label: 'Tablet', width: 380, height: 440, layout: 'portrait' },
	{ id: 'mobile', label: 'Mobile', width: 570, height: 380, layout: 'landscape' },
];

const layouts: Record<OutputSpec['layout'], Layout> = {
	'safe-wide': {
		contentX: 258, contentWidth: 260,
		headerX: 258, headerY: 0, headerWidth: 230, headerHeight: 46, headerSize: 24,
		prefixY: 53, prefixSize: 21,
		offerY: 76, offerSize: 70, offerLineHeight: 62, offerLines: true,
		subheadingY: 190, subheadingSize: 31,
		secondaryY: 226, secondarySize: 20,
		promoY: 268, promoGap: 26, promoSize: 15,
		ctaX: 258, ctaY: 315, ctaWidth: 180, ctaHeight: 44, ctaSize: 20,
		brandsX: 468, brandsY: 273, brandsWidth: 112, brandsHeight: 67,
		termsX: 258, termsY: 366, termsWidth: 330, termsSize: 10,
	},
	portrait: {
		contentX: 48, contentWidth: 284,
		headerX: 48, headerY: 0, headerWidth: 286, headerHeight: 50, headerSize: 23,
		prefixY: 63, prefixSize: 22,
		offerY: 84, offerSize: 78, offerLineHeight: 72, offerLines: true,
		subheadingY: 226, subheadingSize: 32,
		secondaryY: 266, secondarySize: 20,
		promoY: 310, promoGap: 27, promoSize: 15,
		ctaX: 48, ctaY: 368, ctaWidth: 194, ctaHeight: 40, ctaSize: 20,
		brandsX: 248, brandsY: 318, brandsWidth: 98, brandsHeight: 59,
		termsX: 44, termsY: 421, termsWidth: 294, termsSize: 10,
	},
	landscape: {
		contentX: 84, contentWidth: 408,
		headerX: 90, headerY: 0, headerWidth: 300, headerHeight: 48, headerSize: 24,
		prefixY: 66, prefixSize: 22,
		offerY: 84, offerSize: 82, offerLineHeight: 72, offerLines: false,
		subheadingY: 181, subheadingSize: 34,
		secondaryY: 221, secondarySize: 24,
		promoY: 270, promoGap: 27, promoSize: 18,
		ctaX: 84, ctaY: 326, ctaWidth: 156, ctaHeight: 40, ctaSize: 20,
		brandsX: 370, brandsY: 279, brandsWidth: 116, brandsHeight: 70,
		termsX: 86, termsY: 366, termsWidth: 402, termsSize: 12,
	},
};

const generatorRoot = ref<HTMLElement | null>(null);
const headerText = ref('BIG SUMMER SALE');
const headline = ref('UP TO 20% OFF');
const subheading = ref('Selected tyres');
const secondaryOffer = ref('When you buy 2 or more tyres');
const promoOneDescription = ref('10% off');
const promoOneCode = ref('GBP10');
const promoTwoDescription = ref('20% off');
const promoTwoCode = ref('GBP20');
const ctaText = ref('Shop now');
const terms = ref('Online Only. T&Cs apply. 10% off two or three, 20% off four.');
const format = ref<ExportFormat>('png');
const headerScale = ref(100);
const headlineScale = ref(100);
const subheadingScale = ref(100);
const secondaryScale = ref(100);
const promoScale = ref(100);
const ctaScale = ref(100);
const termsScale = ref(100);
const statusMessage = ref('');
const headerFileName = ref('');

const red = '#ff000e';
const white = '#ffffff';
const charcoal = '#242424';
const fontFamily = '"Montserrat", Arial, sans-serif';
let brandArtwork: HTMLImageElement | null = null;
let headerArtwork: HTMLImageElement | null = null;
let animationFrame = 0;

const scaleSize = (size: number, scale: number) => Math.max(6, Math.round(size * scale / 100));

const roundedRect = (
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) => {
	const safeRadius = Math.min(radius, width / 2, height / 2);
	context.beginPath();
	context.moveTo(x + safeRadius, y);
	context.lineTo(x + width - safeRadius, y);
	context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
	context.lineTo(x + width, y + height - safeRadius);
	context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
	context.lineTo(x + safeRadius, y + height);
	context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
	context.lineTo(x, y + safeRadius);
	context.quadraticCurveTo(x, y, x + safeRadius, y);
	context.closePath();
};

const fittedFontSize = (
	context: CanvasRenderingContext2D,
	text: string,
	startSize: number,
	minimumSize: number,
	maxWidth: number,
	weight: number,
) => {
	let size = startSize;
	context.font = `${weight} ${size}px ${fontFamily}`;
	while (context.measureText(text).width > maxWidth && size > minimumSize) {
		size -= 1;
		context.font = `${weight} ${size}px ${fontFamily}`;
	}
	return size;
};

const drawText = (
	context: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	startSize: number,
	minimumSize: number,
	maxWidth: number,
	weight: number,
	colour = white,
	align: CanvasTextAlign = 'left',
) => {
	const size = fittedFontSize(context, text, startSize, minimumSize, maxWidth, weight);
	context.font = `${weight} ${size}px ${fontFamily}`;
	context.fillStyle = colour;
	context.textAlign = align;
	context.textBaseline = 'top';
	context.fillText(text, x, y);
	return size;
};

const splitHeadline = () => {
	const value = headline.value.trim();
	const match = value.match(/^up\s+to\s+(.+)$/i);
	return match ? { prefix: 'UP TO', offer: match[1] } : { prefix: '', offer: value };
};

const splitOfferLines = (offer: string, shouldSplit: boolean) => {
	if (!shouldSplit) return [offer];
	const parts = offer.trim().split(/\s+/);
	if (parts.length < 2) return [offer];
	return [parts.slice(0, -1).join(' '), parts.at(-1) ?? ''];
};

const drawImageContained = (
	context: CanvasRenderingContext2D,
	image: HTMLImageElement,
	x: number,
	y: number,
	width: number,
	height: number,
) => {
	const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
	const drawWidth = image.naturalWidth * ratio;
	const drawHeight = image.naturalHeight * ratio;
	context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
};

const drawHeader = (context: CanvasRenderingContext2D, layout: Layout) => {
	roundedRect(context, layout.headerX, layout.headerY - 14, layout.headerWidth, layout.headerHeight + 14, 14);
	context.fillStyle = white;
	context.fill();
	if (headerArtwork) {
		drawImageContained(
			context,
			headerArtwork,
			layout.headerX + 12,
			layout.headerY + 7,
			layout.headerWidth - 24,
			layout.headerHeight - 12,
		);
		return;
	}
	drawText(
		context,
		headerText.value,
		layout.headerX + layout.headerWidth / 2,
		layout.headerY + 12,
		scaleSize(layout.headerSize, headerScale.value),
		12,
		layout.headerWidth - 24,
		800,
		charcoal,
		'center',
	);
};

const promoLine = (description: string, code: string) => {
	const cleanDescription = description.trim();
	const cleanCode = code.trim();
	if (!cleanCode) return cleanDescription;
	return `${cleanDescription}${cleanDescription ? ' - ' : ''}Use code ${cleanCode}`;
};

const renderCanvas = (canvas: HTMLCanvasElement, spec: OutputSpec) => {
	const context = canvas.getContext('2d');
	if (!context) return;
	const layout = layouts[spec.layout];
	context.clearRect(0, 0, spec.width, spec.height);
	context.fillStyle = red;
	context.fillRect(0, 0, spec.width, spec.height);
	drawHeader(context, layout);

	const { prefix, offer } = splitHeadline();
	if (prefix) {
		drawText(
			context,
			prefix,
			layout.contentX,
			layout.prefixY,
			scaleSize(layout.prefixSize, headlineScale.value),
			12,
			layout.contentWidth,
			800,
		);
	}

	const offerLines = splitOfferLines(offer, layout.offerLines);
	const offerFontSize = scaleSize(layout.offerSize, headlineScale.value);
	offerLines.forEach((line, index) => {
		drawText(
			context,
			line,
			layout.contentX,
			layout.offerY + index * layout.offerLineHeight,
			offerFontSize,
			32,
			layout.contentWidth,
			900,
		);
	});

	drawText(
		context,
		subheading.value,
		layout.contentX,
		layout.subheadingY,
		scaleSize(layout.subheadingSize, subheadingScale.value),
		16,
		layout.contentWidth,
		700,
	);
	drawText(
		context,
		secondaryOffer.value,
		layout.contentX,
		layout.secondaryY,
		scaleSize(layout.secondarySize, secondaryScale.value),
		11,
		layout.contentWidth,
		700,
	);

	const promoFontSize = scaleSize(layout.promoSize, promoScale.value);
	drawText(
		context,
		promoLine(promoOneDescription.value, promoOneCode.value),
		layout.contentX,
		layout.promoY,
		promoFontSize,
		9,
		layout.contentWidth,
		700,
	);
	drawText(
		context,
		promoLine(promoTwoDescription.value, promoTwoCode.value),
		layout.contentX,
		layout.promoY + layout.promoGap,
		promoFontSize,
		9,
		layout.contentWidth,
		700,
	);

	roundedRect(context, layout.ctaX, layout.ctaY, layout.ctaWidth, layout.ctaHeight, 10);
	context.fillStyle = charcoal;
	context.fill();
	drawText(
		context,
		ctaText.value,
		layout.ctaX + layout.ctaWidth / 2,
		layout.ctaY + layout.ctaHeight * 0.25,
		scaleSize(layout.ctaSize, ctaScale.value),
		11,
		layout.ctaWidth - 20,
		700,
		white,
		'center',
	);

	if (brandArtwork) {
		context.drawImage(
			brandArtwork,
			layout.brandsX,
			layout.brandsY,
			layout.brandsWidth,
			layout.brandsHeight,
		);
	}

	drawText(
		context,
		terms.value,
		layout.termsX,
		layout.termsY,
		scaleSize(layout.termsSize, termsScale.value),
		7,
		layout.termsWidth,
		700,
	);
};

const getCanvas = (id: OutputId) => generatorRoot.value?.querySelector<HTMLCanvasElement>(`canvas[data-output="${id}"]`) ?? null;

const renderAll = () => {
	for (const output of outputs) {
		const canvas = getCanvas(output.id);
		if (canvas) renderCanvas(canvas, output);
	}
};

const scheduleRender = () => {
	if (typeof window === 'undefined') return;
	window.cancelAnimationFrame(animationFrame);
	animationFrame = window.requestAnimationFrame(renderAll);
};

const sanitisedFileName = (output: OutputSpec) => {
	const campaign = headline.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	return `${campaign || 'national-banner'}-${output.width}x${output.height}`;
};

const exportOutput = (output: OutputSpec) => {
	const canvas = getCanvas(output.id);
	if (!canvas) return;
	renderCanvas(canvas, output);
	const mimeType = format.value === 'jpeg' ? 'image/jpeg' : 'image/png';
	canvas.toBlob((blob) => {
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${sanitisedFileName(output)}.${format.value === 'jpeg' ? 'jpg' : 'png'}`;
		link.click();
		URL.revokeObjectURL(url);
		statusMessage.value = `${output.label} image exported at ${output.width} × ${output.height}px.`;
	}, mimeType, 0.94);
};

const clearHeaderArtwork = () => {
	headerArtwork = null;
	headerFileName.value = '';
	scheduleRender();
};

const handleHeaderUpload = (event: Event) => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;
	if (!file.type.startsWith('image/')) {
		statusMessage.value = 'Please select an image file.';
		return;
	}
	const reader = new FileReader();
	reader.addEventListener('load', () => {
		const image = new Image();
		image.addEventListener('load', () => {
			headerArtwork = image;
			headerFileName.value = file.name;
			statusMessage.value = `${file.name} added to the header.`;
			scheduleRender();
		}, { once: true });
		image.src = String(reader.result);
	}, { once: true });
	reader.readAsDataURL(file);
};

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
	const image = new Image();
	image.addEventListener('load', () => resolve(image), { once: true });
	image.addEventListener('error', () => reject(new Error(`Could not load ${source}`)), { once: true });
	image.src = source;
});

onMounted(async () => {
	try {
		await Promise.all([
			document.fonts.load('900 82px "Montserrat"'),
			document.fonts.load('800 24px "Montserrat"'),
			document.fonts.load('700 34px "Montserrat"'),
			document.fonts.ready,
		]);
		brandArtwork = await loadImage('/national-image-assets/tyre-brands.svg');
	} catch {
		statusMessage.value = 'Some National artwork could not be loaded. Please refresh the page.';
	} finally {
		await nextTick();
		renderAll();
	}
});

watch(
	[
		headerText, headline, subheading, secondaryOffer,
		promoOneDescription, promoOneCode, promoTwoDescription, promoTwoCode,
		ctaText, terms, headerScale, headlineScale, subheadingScale,
		secondaryScale, promoScale, ctaScale, termsScale,
	],
	scheduleRender,
);
</script>

<template>
	<section ref="generatorRoot" class="national-image-generator" aria-labelledby="national-image-form-title">
		<form class="configurator" @submit.prevent>
			<div class="configurator-heading">
				<svg aria-hidden="true" viewBox="0 0 24 24">
					<path d="M4 5h16v14H4zM8 9h8M8 13h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
				<div>
					<h2 id="national-image-form-title">National Image Generator</h2>
					<p>One set of content, three responsive banner sizes.</p>
				</div>
			</div>
			<hr />

			<div class="form-grid">
				<fieldset class="control-section">
					<legend>Header asset</legend>
					<label for="national-header-text">Header text</label>
					<input id="national-header-text" v-model="headerText" type="text" maxlength="45" :disabled="Boolean(headerFileName)" />
					<label for="national-header-file">Or upload a logo/image</label>
					<input id="national-header-file" class="file-input" type="file" accept="image/*" @change="handleHeaderUpload" />
					<div v-if="headerFileName" class="uploaded-file">
						<span>{{ headerFileName }}</span>
						<button type="button" @click="clearHeaderArtwork">Remove</button>
					</div>
					<div class="range-row">
						<label for="national-header-size">Header size</label>
						<input id="national-header-size" v-model.number="headerScale" type="range" min="70" max="140" step="5" />
						<output>{{ headerScale }}%</output>
					</div>
				</fieldset>

				<fieldset class="control-section">
					<legend>Primary messaging</legend>
					<label for="national-headline">Main headline</label>
					<input id="national-headline" v-model="headline" type="text" maxlength="40" />
					<div class="range-row">
						<label for="national-headline-size">Headline size</label>
						<input id="national-headline-size" v-model.number="headlineScale" type="range" min="70" max="130" step="5" />
						<output>{{ headlineScale }}%</output>
					</div>
					<label for="national-subheading">Mustache text / sub-heading</label>
					<input id="national-subheading" v-model="subheading" type="text" maxlength="55" />
					<div class="range-row">
						<label for="national-subheading-size">Sub-heading size</label>
						<input id="national-subheading-size" v-model.number="subheadingScale" type="range" min="70" max="140" step="5" />
						<output>{{ subheadingScale }}%</output>
					</div>
					<label for="national-secondary">Secondary offer text</label>
					<input id="national-secondary" v-model="secondaryOffer" type="text" maxlength="75" />
					<div class="range-row">
						<label for="national-secondary-size">Secondary size</label>
						<input id="national-secondary-size" v-model.number="secondaryScale" type="range" min="70" max="140" step="5" />
						<output>{{ secondaryScale }}%</output>
					</div>
				</fieldset>

				<fieldset class="control-section">
					<legend>Promo codes</legend>
					<div class="paired-inputs">
						<div>
							<label for="national-promo-one-description">Code 1 description</label>
							<input id="national-promo-one-description" v-model="promoOneDescription" type="text" maxlength="35" />
						</div>
						<div>
							<label for="national-promo-one-code">Code 1</label>
							<input id="national-promo-one-code" v-model="promoOneCode" type="text" maxlength="20" />
						</div>
						<div>
							<label for="national-promo-two-description">Code 2 description</label>
							<input id="national-promo-two-description" v-model="promoTwoDescription" type="text" maxlength="35" />
						</div>
						<div>
							<label for="national-promo-two-code">Code 2</label>
							<input id="national-promo-two-code" v-model="promoTwoCode" type="text" maxlength="20" />
						</div>
					</div>
					<div class="range-row">
						<label for="national-promo-size">Promo size</label>
						<input id="national-promo-size" v-model.number="promoScale" type="range" min="70" max="140" step="5" />
						<output>{{ promoScale }}%</output>
					</div>
				</fieldset>

				<fieldset class="control-section">
					<legend>CTA and terms</legend>
					<label for="national-cta">Button text</label>
					<input id="national-cta" v-model="ctaText" type="text" maxlength="30" />
					<div class="range-row">
						<label for="national-cta-size">CTA size</label>
						<input id="national-cta-size" v-model.number="ctaScale" type="range" min="70" max="140" step="5" />
						<output>{{ ctaScale }}%</output>
					</div>
					<label for="national-terms">Terms and conditions</label>
					<textarea id="national-terms" v-model="terms" rows="3" maxlength="200"></textarea>
					<div class="range-row">
						<label for="national-terms-size">Terms size</label>
						<input id="national-terms-size" v-model.number="termsScale" type="range" min="70" max="140" step="5" />
						<output>{{ termsScale }}%</output>
					</div>
					<div class="format-row">
						<label for="national-image-format">Export format</label>
						<select id="national-image-format" v-model="format">
							<option value="png">PNG</option>
							<option value="jpeg">JPEG</option>
						</select>
					</div>
				</fieldset>
			</div>
		</form>

		<section class="preview-panel" aria-labelledby="national-live-preview">
			<div class="preview-heading">
				<div>
					<h2 id="national-live-preview">Responsive previews</h2>
					<p>All three outputs update as you edit the form.</p>
				</div>
				<span>Montserrat</span>
			</div>
			<div class="preview-list">
				<article v-for="output in outputs" :key="output.id" class="preview-card">
					<header>
						<div>
							<h3>{{ output.label }}</h3>
							<p>{{ output.width }} × {{ output.height }} px</p>
						</div>
						<button type="button" @click="exportOutput(output)">
							<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 14v6h14v-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
							Export {{ output.label }}
						</button>
					</header>
					<div class="canvas-frame">
						<canvas
							:data-output="output.id"
							:width="output.width"
							:height="output.height"
							role="img"
							:aria-label="`${output.label} National banner preview at ${output.width} by ${output.height} pixels`"
						>
							Your browser does not support the canvas preview.
						</canvas>
					</div>
				</article>
			</div>
			<p v-if="statusMessage" class="generator-status" aria-live="polite">{{ statusMessage }}</p>
		</section>
	</section>
</template>

<style scoped>
	.national-image-generator {
		--ui-background: #ffffff;
		--ui-foreground: #09090b;
		--ui-muted: #f4f4f5;
		--ui-muted-foreground: #71717a;
		--ui-border: #e4e4e7;
		--ui-primary: #18181b;
		--ui-primary-hover: #27272a;
		margin-block: 1.25rem 2rem;
		color: var(--ui-foreground);
		font-family: 'Montserrat', Arial, sans-serif;
	}

	.configurator,
	.preview-panel {
		width: min(100%, 58rem);
		margin-inline: auto;
	}

	.configurator {
		padding: clamp(1rem, 3vw, 1.5rem);
		background: var(--ui-background);
		border: 1px solid var(--ui-border);
		border-radius: 0.75rem;
		box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
	}

	.configurator-heading,
	.preview-heading,
	.preview-card > header,
	.uploaded-file,
	.format-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.configurator-heading {
		justify-content: flex-start;
	}

	.configurator-heading > svg {
		width: 2rem;
		height: 2rem;
		padding: 0.4rem;
		background: var(--ui-muted);
		border-radius: 0.5rem;
	}

	.configurator-heading h2,
	.configurator-heading p,
	.preview-heading h2,
	.preview-heading p,
	.preview-card h3,
	.preview-card p {
		margin: 0;
		padding: 0;
		border: 0;
	}

	.configurator-heading h2,
	.preview-heading h2 {
		font-size: 1.25rem;
		letter-spacing: -0.02em;
	}

	.configurator-heading p,
	.preview-heading p,
	.preview-card p {
		margin-top: 0.15rem;
		color: var(--ui-muted-foreground);
		font-size: 0.78rem;
	}

	.configurator > hr {
		margin: 0.9rem 0 1.25rem;
		border: 0;
		border-top: 1px solid var(--ui-border);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.control-section {
		min-width: 0;
		margin: 0;
		padding: 1rem;
		background: var(--ui-background);
		border: 1px solid var(--ui-border);
		border-radius: 0.6rem;
	}

	.control-section legend {
		padding-inline: 0.35rem;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.control-section > label,
	.paired-inputs label,
	.format-row label {
		display: block;
		margin: 0.75rem 0 0.4rem;
		font-size: 0.78rem;
		font-weight: 700;
	}

	input[type='text'],
	input[type='file'],
	textarea,
	select {
		width: 100%;
		box-sizing: border-box;
		padding: 0.625rem 0.75rem;
		color: var(--ui-foreground);
		background: var(--ui-background);
		border: 1px solid var(--ui-border);
		border-radius: 0.5rem;
		font: inherit;
		font-size: 0.84rem;
		box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
	}

	input:disabled {
		color: var(--ui-muted-foreground);
		background: var(--ui-muted);
	}

	.file-input::file-selector-button {
		margin-right: 0.65rem;
		padding: 0.35rem 0.55rem;
		background: var(--ui-muted);
		border: 0;
		border-radius: 0.35rem;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	textarea {
		resize: vertical;
		line-height: 1.45;
	}

	input:focus-visible,
	textarea:focus-visible,
	select:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--ui-primary);
		outline-offset: 2px;
	}

	.paired-inputs {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(7rem, 0.55fr);
		gap: 0 0.65rem;
	}

	.range-row {
		display: grid;
		grid-template-columns: 7rem minmax(0, 1fr) 3rem;
		gap: 0.55rem;
		align-items: center;
		margin-top: 0.7rem;
		color: var(--ui-muted-foreground);
		font-size: 0.72rem;
	}

	.range-row label {
		margin: 0;
	}

	.range-row input {
		width: 100%;
		accent-color: var(--ui-primary);
	}

	.range-row output {
		color: var(--ui-foreground);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.uploaded-file {
		margin-top: 0.55rem;
		padding: 0.5rem 0.65rem;
		background: var(--ui-muted);
		border-radius: 0.4rem;
		font-size: 0.72rem;
	}

	.uploaded-file span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.uploaded-file button {
		padding: 0;
		color: #b91c1c;
		background: transparent;
		border: 0;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.format-row {
		margin-top: 1rem;
	}

	.format-row label {
		margin: 0;
	}

	.format-row select {
		width: 9rem;
	}

	.preview-panel {
		margin-top: 2rem;
	}

	.preview-heading {
		margin-bottom: 1rem;
	}

	.preview-heading > span {
		padding: 0.3rem 0.55rem;
		background: var(--ui-muted);
		border: 1px solid var(--ui-border);
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.preview-list {
		display: grid;
		gap: 1rem;
	}

	.preview-card {
		padding: 1rem;
		background: var(--ui-background);
		border: 1px solid var(--ui-border);
		border-radius: 0.75rem;
		box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
	}

	.preview-card h3 {
		font-size: 1rem;
	}

	.preview-card button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 0.75rem;
		color: #fff;
		background: var(--ui-primary);
		border: 1px solid transparent;
		border-radius: 0.5rem;
		font: inherit;
		font-size: 0.76rem;
		font-weight: 700;
		cursor: pointer;
	}

	.preview-card button:hover {
		background: var(--ui-primary-hover);
	}

	.preview-card button svg {
		width: 1rem;
	}

	.canvas-frame {
		display: grid;
		margin-top: 0.85rem;
		padding: 0.75rem;
		place-items: center;
		overflow: hidden;
		background: var(--ui-muted);
		border: 1px solid var(--ui-border);
		border-radius: 0.5rem;
	}

	canvas {
		display: block;
		width: 100%;
		height: auto;
		background: var(--ui-background);
	}

	canvas[data-output='tablet'] {
		width: min(100%, 29rem);
	}

	.generator-status {
		margin: 1rem 0 0;
		color: var(--ui-muted-foreground);
		font-size: 0.78rem;
		text-align: center;
	}

	@media (max-width: 48rem) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 35rem) {
		.configurator,
		.preview-card {
			padding: 1rem;
		}

		.paired-inputs {
			grid-template-columns: 1fr;
		}

		.range-row {
			grid-template-columns: 6rem minmax(0, 1fr) 2.75rem;
		}

		.preview-card > header {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
