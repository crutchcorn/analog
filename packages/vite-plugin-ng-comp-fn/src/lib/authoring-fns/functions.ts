import {
  ArrowFunction,
  CallExpression,
  FunctionExpression,
  Project,
  SourceFile,
  SyntaxKind,
} from 'ts-morph';
import { basename } from 'path';

export function compileAngularFn(
  filePath: string,
  fileContent: string,
  shouldFormat = false
) {
  const componentName = basename(filePath).split('.')[0];

  if (!componentName) {
    throw new Error(`[Analog] Missing component name ${filePath}`);
  }

  const className = toClassName(componentName);
  const entityName = `${className}AnalogComponent`;

  const project = new Project({ useInMemoryFileSystem: true });
  return processFunctionFile(
    filePath,
    project.createSourceFile(filePath, fileContent),
    entityName,
    shouldFormat
  );
}

function processFunctionFile(
  fileName: string,
  sourceFile: SourceFile,
  entityName: string,
  isProd?: boolean
) {
  const fnImport = sourceFile.getImportDeclaration('ng-comp-fn');

  if (!fnImport) {
    // [Analog] Missing import of \`@analog/angular-fn\` in ${fileName}
    return sourceFile.getText();
  }

  const componentImport = fnImport.getNamedImports().find((namedImport) => {
    return namedImport.getName() === 'Component';
  });

  if (!componentImport) {
    throw new Error(
      `[Analog] Missing named import of \`Component\` from \`@analog/angular-fn\` in ${fileName}`
    );
  }

  const componentName =
    componentImport.getAliasNode()?.getText() || 'Component';

  /**
   * `import {Component as AComponent} from "@analog/angular-fn";`
   *
   * Find usages of `AComponent`
   *
   * `AComponent` is `componentName` from above
   */
  const componentUsages = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .reduce((prev, callExpression) => {
      // We want to get the call expression that has the `Component` import alias as the first child, but we need to get
      // the parent of the call expression to get the full `Component` call expression with the metadata and function body
      if (
        callExpression.getFirstChildByKind(SyntaxKind.Identifier)?.getText() ===
        componentName
      ) {
        prev.push(callExpression.getParent() as CallExpression);
      }
      return prev;
    }, [] as CallExpression[]);

  if (!componentUsages.length) {
    // Missing usage of \`Component\` from \`@analog/angular-fn\` in ${fileName}
    return sourceFile.getText();
  }

  componentUsages.forEach((componentUsage) => {
    transformComponentUsage(sourceFile, componentUsage, entityName, isProd);
  });

  /**
   * Remove the import of `@analog/angular-fn`
   *
   * For some reason, `fnImport.remove()` doesn't work, so we have to do it manually
   */
  const allImports = sourceFile.getImportDeclarations();
  const importToRemove = allImports.find((importDeclaration) => {
    return importDeclaration
      .getNamedImports()
      .find((namedImport) => namedImport.getName() === componentName);
  });

  if (importToRemove) {
    importToRemove.remove();
  }

  // Add the import of `@angular/core`
  sourceFile.addImportDeclaration({
    moduleSpecifier: '@angular/core',
    namedImports: ['Component'],
  });

  return sourceFile.getText();
}

function transformComponentUsage(
  sourceFile: SourceFile,
  /**
   * `Component({...})(() => { ... })`
   */
  componentUsage: CallExpression,
  entityName: string,
  isProd?: boolean
) {
  const varNames: string[] = [];

  /**
   * Handle the metadata argument
   * `({ selector: 'app-root', standalone: true, template: '<button (click)="add()">{{count}}</button>' })`
   *
   * We still need to extract the object literal expression from the call expression
   */
  const componentMetadataArgCallExpression = componentUsage.getChildrenOfKind(
    SyntaxKind.CallExpression
  )[0];
  if (!componentMetadataArgCallExpression) {
    throw new Error(
      `[Analog] Missing component metadata argument in ${componentUsage.getText()}`
    );
  }
  const componentMetadata = componentMetadataArgCallExpression
    .getArguments()[0]
    .getText();

  /**
   * Handle the function body
   *
   * `() => { ... }` or `function() { ... }`
   *
   * We need to append a `return` statement to the function body for each `VariableDeclaration` and `FunctionDeclaration`
   */
  let fnToTransform: ArrowFunction | FunctionExpression =
    componentUsage.getChildrenOfKind(SyntaxKind.ArrowFunction)[0];

  if (!fnToTransform) {
    fnToTransform = componentUsage.getChildrenOfKind(
      SyntaxKind.FunctionExpression
    )[0];
  }

  const fnBlock = fnToTransform?.getChildrenOfKind(SyntaxKind.Block)[0];

  // Is this even possible to hit?
  if (!fnBlock) {
    throw new Error(
      `[Analog] Missing function block in ${componentUsage.getText()}`
    );
  }

  const returnStatement = fnBlock.getLastChildByKind(
    SyntaxKind.ReturnStatement
  );
  if (returnStatement) {
    // TODO: Handle `return` statement, especially early returns
    //   We can do this by merging the value being returned with the object literal expression of our vars and functions
    throw new Error(
      `[Analog] Function body already has a return statement in ${componentUsage.getText()}.\n Return statements are not currently allowed in Angular function components.`
    );
  }

  const fnFunctionDeclarations = fnBlock.getFunctions();
  const fnVariableDeclarations = fnBlock.getVariableDeclarations();

  [...fnFunctionDeclarations, ...fnVariableDeclarations].forEach(
    (declaration) => {
      const varName = declaration
        .getFirstChildByKind(SyntaxKind.Identifier)
        ?.getText();
      if (!varName) {
        throw new Error(
          `[Analog] Missing variable name in ${declaration.getText()}`
        );
      }

      varNames.push(varName);
    }
  );

  /**
   * Append `return` statement to the function body
   *
   * For each item in `varNames`, add it to the `return {}` object
   */
  const returnObject = `{ ${varNames
    .map((varName) => `${varName}: ${varName}`)
    .join(', ')} }`;

  fnBlock.addStatements(`return ${returnObject};`);

  const newComponentUsage = `
    @Component(${componentMetadata})
    class ${entityName} {
      data = (${fnToTransform.getText()})();

      ${varNames
        .map((varName) => `${varName} = this.data.${varName};`)
        .join('\n')}
    }
  `;

  // Replace the original component usage with the new component usage
  sourceFile.replaceText(
    [componentUsage.getStart(), componentUsage.getEnd()],
    newComponentUsage
  );
}

/**
 * Hyphenated to UpperCamelCase
 */
export function toClassName(str: string) {
  return toCapitalCase(toPropertyName(str));
}
/**
 * Hyphenated to lowerCamelCase
 */
function toPropertyName(str: string) {
  return str
    .replace(/([^a-zA-Z0-9])+(.)?/g, (_, __, chr) =>
      chr ? chr.toUpperCase() : ''
    )
    .replace(/[^a-zA-Z\d]/g, '')
    .replace(/^([A-Z])/, (m) => m.toLowerCase())
    .replace(/^\d+/, '');
}

/**
 * Capitalizes the first letter of a string
 */
function toCapitalCase(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
