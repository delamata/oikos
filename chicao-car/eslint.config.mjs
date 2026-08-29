import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    // O react-hook-form expõe o estado do formulário por proxies, que o
    // verificador do React Compiler ainda não consegue analisar. Os avisos aqui
    // são falsos positivos da biblioteca, não padrões inseguros no nosso código.
    files: ["src/features/**/*.tsx", "src/components/forms/**/*.tsx"],
    rules: { "react-hooks/incompatible-library": "off" },
  },
  {
    // Estes dois providers existem justamente para sincronizar o React com
    // sistemas externos (localStorage e Supabase Auth) — o caso de uso previsto
    // para efeitos, mesmo que a regra não consiga distingui-lo.
    files: ["src/lib/data/provider.tsx", "src/lib/auth/provider.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
]);

export default eslintConfig;
