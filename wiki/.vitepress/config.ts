import { defineConfig } from 'vitepress';

export default defineConfig({
	title: 'Maj_Mini',
	description: '四川麻将（定缺 / 血战到底）playground 与 AI 训练框架',
	lang: 'zh-CN',
	lastUpdated: true,
	// GitHub Pages serves at https://adarkmaker.github.io/Maj_mini/
	base: '/Maj_mini/',
	// GitHub Pages lacks server rewrite for clean URLs; keep .html to avoid 404.
	cleanUrls: false,
	head: [['link', { rel: 'icon', href: '/Maj_mini/logo.png' }]],
	locales: {
		root: {
			label: '简体中文',
			lang: 'zh-CN',
			themeConfig: {
				nav: nav('zh'),
				sidebar: sidebar('zh'),
				footer: {
					message: 'Released under the MIT License.',
					copyright: 'Copyright © 2026 aDarkMaker',
				},
				docFooter: { prev: '上一页', next: '下一页' },
				outline: { label: '本页目录' },
				lastUpdated: { text: '最后更新' },
				returnToTopLabel: '回到顶部',
				sidebarMenuLabel: '菜单',
				darkModeSwitchLabel: '主题',
				lightModeSwitchTitle: '切换到浅色模式',
				darkModeSwitchTitle: '切换到深色模式',
			},
		},
		en: {
			label: 'English',
			lang: 'en',
			link: '/en/',
			themeConfig: {
				nav: nav('en'),
				sidebar: sidebar('en'),
				footer: {
					message: 'Released under the MIT License.',
					copyright: 'Copyright © 2026 aDarkMaker',
				},
			},
		},
	},
	themeConfig: {
		socialLinks: [{ icon: 'github', link: 'https://github.com/aDarkMaker/Maj_mini' }],
		search: { provider: 'local' },
	},
});

function nav(lang: 'zh' | 'en') {
	const t = lang === 'zh';
	return [
		{ text: t ? '产品' : 'Product', link: t ? '/intro/product' : '/en/intro/product' },
		{ text: t ? '架构' : 'Architecture', link: t ? '/architecture/overview' : '/en/architecture/overview' },
		{ text: t ? '开发' : 'Development', link: t ? '/development/setup' : '/en/development/setup' },
		{ text: t ? '用例' : 'Use Cases', link: t ? '/use-cases/scenarios' : '/en/use-cases/scenarios' },
	];
}

function sidebar(lang: 'zh' | 'en') {
	const t = lang === 'zh';
	const p = (s: string) => (lang === 'zh' ? s : `/en${s}`);
	return [
		{
			text: t ? '产品' : 'Product',
			items: [
				{ text: t ? '产品介绍' : 'Product', link: p('/intro/product') },
				{ text: t ? '功能特性' : 'Features', link: p('/intro/features') },
				{ text: t ? '快速开始' : 'Quick Start', link: p('/intro/quickstart') },
			],
		},
		{
			text: t ? '架构' : 'Architecture',
			items: [
				{ text: t ? '总览' : 'Overview', link: p('/architecture/overview') },
				{ text: t ? '引擎' : 'Engine', link: p('/architecture/engine') },
				{ text: t ? 'AI 训练' : 'AI Training', link: p('/architecture/ai') },
				{ text: t ? '数据流' : 'Data Flow', link: p('/architecture/data-flow') },
			],
		},
		{
			text: t ? '开发' : 'Development',
			items: [
				{ text: t ? '环境搭建' : 'Setup', link: p('/development/setup') },
				{ text: t ? '构建与测试' : 'Build & Test', link: p('/development/build') },
			],
		},
		{
			text: t ? '用例' : 'Use Cases',
			items: [{ text: t ? '场景' : 'Scenarios', link: p('/use-cases/scenarios') }],
		},
	];
}