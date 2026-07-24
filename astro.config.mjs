import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
	adapter: vercel({
		edgeMiddleware: true,
	}),
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
					],
				},
				{
					label: 'Web Trends',
					items: [{ label: 'Overview', slug: 'web-trends' }],
				},
				{
					label: 'PWA',
					items: [{ label: 'Overview', slug: 'pwa' }],
				},
			],
		}),
		vue(),
	],
});
