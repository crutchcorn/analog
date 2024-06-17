class NoFunctionError extends Error {
  constructor() {
    super(
      `
You've attempted to use \`@analogjs/angular-fn\` without enabling the authoring functionality in the Vite plugin.

To enable the authoring functionality, add the following to your Vite config:

\`\`\`
import { defineConfig } from 'vite'
import analog from '@analogjs/platform';

export default defineConfig({
  plugins: [
    analog({
      vite: {
        experimental: {
          supportFunctionComponents: true,
        },
      },
    }),
  ]
})
\`\`\`

Without this configuration, any of the runtime behavior that depends on the authoring functionality (currently everything) will throw this error.
    `.trim()
    );
  }
}

export const Component = () => {
  throw new NoFunctionError();
};
