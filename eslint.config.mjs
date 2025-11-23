import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";

const { flatConfig } = nextPlugin;

export default [
  // ベースのJavaScript推奨ルール
  js.configs.recommended,
  // Next.js 向けの Core Web Vitals ルール（Flat Config形式）
  flatConfig.coreWebVitals,
  // プロジェクト固有の除外設定
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];
