import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Relatix",
  description: "Relatix technical docs",
  base: "/relatix-docs/",
  head: [
    [
      "link",
      { rel: "icon", type: "image/x-icon", href: "/relatix-docs/favicon.ico" },
    ],
  ],
  themeConfig: {
    logo: "relatix-logo.png",

    sidebar: [
      {
        text: "Relatix",
        items: [
          { text: "Intro", link: "/en/intro" },
          { text: "Workflow", link: "/en/workflow" },
          { text: "Modeling", link: "/en/modeling" },
          { text: "Model Usage", link: "/en/usage" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/relatixjs/relatix" },
    ],
  },
  markdown: {
    theme: "dark-plus",
  },
});
