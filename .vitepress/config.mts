import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Relatix",
  description: "Relatix technical docs",
  base: "/",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // nav: [
    //   { text: "Home", link: "/" },
    //   { text: "Examples", link: "/markdown-examples" },
    // ],

    sidebar: [
      {
        text: "Relatix",
        items: [
          {
            text: "Intro",
            link: "/en/intro",
          },
          {
            text: "Workflow",
            link: "/en/workflow",
          },
          {
            text: "Modeling",
            link: "/en/modeling",
          },
          {
            text: "Model Usage",
            link: "/en/usage",
          },
        ],
      },
    ],

    socialLinks: [
      // { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
  markdown: {
    theme: "dark-plus",
  },
});
