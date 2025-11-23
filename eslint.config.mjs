import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  // ベースのJavaScript推奨ルール
  js.configs.recommended,
  // Next.js 向けの Core Web Vitals ルール（Flat Config）
  nextPlugin.configs["core-web-vitals"],
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
