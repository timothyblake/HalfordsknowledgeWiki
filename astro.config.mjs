import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Knowledge Wiki',
			head: [
				{
					tag: 'meta',
					attrs: { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet' },
				},
				{
					tag: 'meta',
					attrs: { name: 'googlebot', content: 'noindex, nofollow, noarchive, nosnippet' },
				},
				{
					tag: 'meta',
					attrs: { name: 'bingbot', content: 'noindex, nofollow, noarchive, nosnippet' },
				},
			],
			components: {
				ThemeProvider: './src/components/ThemeProvider.astro',
				SiteTitle: './src/components/SiteTitle.astro',
			},
			sidebar: [
				{
					label: 'Quick Link Tool',
					items: [
						{ label: 'Getting Started', slug: 'quick-link-tool/getting-started' },
						{ label: 'Feature Guide', slug: 'quick-link-tool/features' },
						{ label: 'Release Notes', slug: 'quick-link-tool/release-notes' },
					],
				},
				{
					label: 'Image Generators',
					items: [
						{ label: 'Overview', slug: 'product-images' },
						{ label: 'Product Review Images', slug: 'product-images/product-review-images' },
						{ label: 'Bulk Product Review Images', slug: 'product-images/bulk-product-review-images' },
						{ label: 'Product Information Images', slug: 'product-images/product-information' },
						{ label: 'Bulk Product Information Images', slug: 'product-images/bulk-product-information' },
					],
				},
				{
					label: 'National',
					items: [
						{ label: 'National Image Generator', slug: 'product-images/national-image-generator' },
						{ label: 'National Image Sizes', slug: 'national/image-sizes' },
					],
				},
				{
					label: 'Web Trends',
					items: [
						{ label: 'Overview', slug: 'web-trends' },
						{ label: 'Route Change Handling', slug: 'web-trends/route-change-handling' },
						{ label: 'Enabling Staging Mode', slug: 'web-trends/staging-mode' },
					],
				},
				{
					label: 'Halfords PWA',
					items: [{ label: 'Overview', slug: 'pwa' }],
				},
				{
					label: 'Salesforce',
					items: [
						{ label: 'Salesforce Syntax', slug: 'salesforce/salesforce-syntax' },
					],
				},
				{
					label: 'Useful Links',
					items: [{ label: 'Overview', slug: 'useful-links' }],
				},
			],
		}),
		vue(),
	],
});
