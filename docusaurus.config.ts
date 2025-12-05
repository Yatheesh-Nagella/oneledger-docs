import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'OneLedger Documentation',
  tagline: 'Personal Finance Tracker with Plaid Integration',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://Yatheesh-Nagella.github.io', // TODO: Update with your GitHub username
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/oneledger-docs/',

  // GitHub pages deployment config.
  organizationName: 'Yatheesh-Nagella', // TODO: Update with your GitHub username
  projectName: 'oneledger-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Mermaid diagrams support
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Yatheesh-Nagella/oneledger-docs/tree/main/',
          // Versioning configuration - disabled for now
          // lastVersion: 'current',
          // versions: {
          //   current: {
          //     label: 'Next 🚧',
          //     path: 'next',
          //     banner: 'unreleased',
          //   },
          // },
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/Yatheesh-Nagella/oneledger-docs/tree/main/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
          blogTitle: 'OneLedger Blog',
          blogDescription: 'Updates, changelogs, and guides for OneLedger',
          blogSidebarTitle: 'Recent posts',
          blogSidebarCount: 10,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/oneledger-social-card.jpg',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'OneLedger',
      logo: {
        alt: 'OneLedger Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/getting-started/installation',
          label: 'Get Started',
          position: 'left',
        },
        {
          to: '/docs/api/overview',
          label: 'API',
          position: 'left',
        },
        // Blog disabled for now - no blog posts yet
        // {
        //   to: '/blog',
        //   label: 'Blog',
        //   position: 'left'
        // },
        // Versioning disabled for now
        // {
        //   type: 'docsVersionDropdown',
        //   position: 'right',
        //   dropdownActiveClassDisabled: true,
        // },
        {
          href: 'https://github.com/Yatheesh-Nagella/oneledger-docs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started/installation',
            },
            {
              label: 'Architecture',
              to: '/docs/architecture/overview',
            },
            {
              label: 'API Reference',
              to: '/docs/api/overview',
            },
            {
              label: 'Troubleshooting',
              to: '/docs/guides/troubleshooting',
            },
          ],
        },
        {
          title: 'Guides',
          items: [
            {
              label: 'Authentication',
              to: '/docs/architecture/authentication',
            },
            {
              label: 'Security',
              to: '/docs/guides/security',
            },
            {
              label: 'Development',
              to: '/docs/guides/development',
            },
            {
              label: 'Database Schema',
              to: '/docs/architecture/database',
            },
          ],
        },
        {
          title: 'More',
          items: [
            // Blog disabled for now
            // {
            //   label: 'Blog',
            //   to: '/blog',
            // },
            {
              label: 'GitHub',
              href: 'https://github.com/Yatheesh-Nagella/oneledger-docs',
            },
            {
              label: 'Main App',
              href: 'https://finance.yatheeshnagella.com',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} OneLedger. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'javascript', 'json', 'sql', 'diff'],
    },
    // Algolia search (configure later when you have the site deployed)
    // algolia: {
    //   appId: 'YOUR_APP_ID',
    //   apiKey: 'YOUR_SEARCH_API_KEY',
    //   indexName: 'oneledger',
    //   contextualSearch: true,
    // },
    // Announcements banner (optional)
    // announcementBar: {
    //   id: 'support_us',
    //   content:
    //     '⭐️ If OneLedger helps you, give us a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/Yatheesh-Nagella/yatheesh-portfolio">GitHub</a>!',
    //   backgroundColor: '#fafbfc',
    //   textColor: '#091E42',
    //   isCloseable: true,
    // },
  } satisfies Preset.ThemeConfig,
};

export default config;
