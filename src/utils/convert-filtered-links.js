const FILTER_LABELS = {
	brandname: 'Brand',
};

function getFilterLabel(filterName) {
	return FILTER_LABELS[filterName.toLowerCase()] ?? filterName;
}

function getFilterValues(rawValues) {
	return rawValues
		.flatMap((value) => value.split(/[|,]/))
		.map((value) => value.trim())
		.filter(Boolean);
}

function convertUrl(urlValue) {
	const usesHtmlEntities = /&amp;/i.test(urlValue);
	const normalizedUrl = urlValue.replace(/&amp;/gi, '&');
	const queryStart = normalizedUrl.indexOf('?');

	if (queryStart === -1) return { value: urlValue, converted: false };

	const hashStart = normalizedUrl.indexOf('#', queryStart);
	const beforeQuery = normalizedUrl.slice(0, queryStart);
	const query = normalizedUrl.slice(queryStart + 1, hashStart === -1 ? undefined : hashStart);
	const hash = hashStart === -1 ? '' : normalizedUrl.slice(hashStart);
	const params = new URLSearchParams(query);
	const convertedFilters = [];
	const parameterNames = [...new Set(params.keys())];

	for (const parameterName of parameterNames) {
		const match = /^prefn(\d+)$/i.exec(parameterName);
		if (!match) continue;

		const filterName = params.get(parameterName)?.trim();
		const valueParameter = `prefv${match[1]}`;
		const filterValues = getFilterValues(params.getAll(valueParameter));

		if (!filterName || filterValues.length === 0) continue;

		const quotedValues = filterValues.map((value) => `"${value}"`).join(',');
		convertedFilters.push(`${getFilterLabel(filterName)}:${quotedValues}`);
		params.delete(parameterName);
		params.delete(valueParameter);
	}

	if (convertedFilters.length === 0) return { value: urlValue, converted: false };

	for (const filter of convertedFilters) params.append('fq', filter);

	const convertedQuery = params.toString().replace(/\+/g, '%20');
	let convertedUrl = `${beforeQuery}?${convertedQuery}${hash}`;
	if (usesHtmlEntities) convertedUrl = convertedUrl.replace(/&/g, '&amp;');

	return { value: convertedUrl, converted: true };
}

export function convertBrandLinks(htmlContent) {
	let count = 0;
	const attributePattern = /(\bhref\s*=\s*)(["'])([\s\S]*?)\2/gi;
	let convertedHtml = htmlContent.replace(attributePattern, (match, prefix, quote, href) => {
		const converted = convertUrl(href);
		if (!converted.converted) return match;
		count += 1;
		return `${prefix}${quote}${converted.value}${quote}`;
	});

	// Also support pasting a URL on its own for quick checks.
	if (count === 0 && !convertedHtml.includes('<')) {
		const converted = convertUrl(convertedHtml.trim());
		if (converted.converted) {
			convertedHtml = converted.value;
			count = 1;
		}
	}

	return { html: convertedHtml, count };
}
