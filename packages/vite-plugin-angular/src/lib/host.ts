import { CompilerHost } from '@angular/compiler-cli';
import { normalizePath } from '@ngtools/webpack/src/ivy/paths.js';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { compileAngularFn } from './authoring-fns/functions.js';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function augmentHostWithResources(
  host: ts.CompilerHost,
  transform: (
    code: string,
    id: string,
    options?: { ssr?: boolean }
  ) => ReturnType<any> | null,
  options: {
    supportFunctionComponents?:
      | boolean
      | {
          include: string[];
        };

    isProd?: boolean;
  } = {}
) {
  const ts = require('typescript');
  const resourceHost = host as CompilerHost;
  const baseGetSourceFile = (
    resourceHost as ts.CompilerHost
  ).getSourceFile.bind(resourceHost);

  if (options.supportFunctionComponents) {
    (resourceHost as ts.CompilerHost).getSourceFile = (
      fileName,
      languageVersionOrOptions,
      onError,
      ...parameters
    ) => {
      if (options.supportFunctionComponents && fileName.endsWith('.ts')) {
        const contents = readFileSync(fileName, 'utf-8');
        const source = compileAngularFn(fileName, contents, options.isProd);

        return ts.createSourceFile(
          fileName,
          source,
          languageVersionOrOptions,
          onError as any,
          ...(parameters as any)
        );
      }

      return baseGetSourceFile.call(
        resourceHost,
        fileName,
        languageVersionOrOptions,
        onError,
        ...parameters
      );
    };

    const baseReadFile = (resourceHost as ts.CompilerHost).readFile;

    (resourceHost as ts.CompilerHost).readFile = function (fileName: string) {
      return baseReadFile.call(resourceHost, fileName);
    };

    const fileExists = (resourceHost as ts.CompilerHost).fileExists;

    (resourceHost as ts.CompilerHost).fileExists = function (fileName: string) {
      return fileExists.call(resourceHost, fileName);
    };
  }

  resourceHost.readResource = async function (fileName: string) {
    const filePath = normalizePath(fileName);

    let content = (this as any).readFile(filePath);

    if (content === undefined) {
      throw new Error('Unable to locate component resource: ' + fileName);
    }

    return content;
  };

  resourceHost.transformResource = async function (data, context) {
    // Only style resources are supported currently
    if (context.type !== 'style') {
      return null;
    }

    return null;
  };
}
