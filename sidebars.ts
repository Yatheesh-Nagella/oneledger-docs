import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/database',
        'architecture/authentication',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/security',
        'guides/development',
        'guides/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/helper-libraries',
      ],
    },
  ],
};

export default sidebars;
