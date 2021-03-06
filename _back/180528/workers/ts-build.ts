import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";

const context = process.argv[2];

process.on("message", (filePaths: string[]) => {
  const tsconfig = fs.readJsonSync(path.resolve(context, "tsconfig.json"));
  tsconfig.compilerOptions.outDir = tsconfig.compilerOptions.outDir || "dist";
  if (tsconfig.compilerOptions.paths) {
    for (const key of Object.keys(tsconfig.compilerOptions.paths)) {
      for (let i = 0; i < tsconfig.compilerOptions.paths[key].length; i++) {
        tsconfig.compilerOptions.paths[key][i] = tsconfig.compilerOptions.paths[key][i].replace(/[\\/]src[\\/]([^\\/.]*)\.ts$/, "");
      }
    }
  }

  const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, context);

  const tsProgram = ts.createProgram(
    parsed.fileNames,
    parsed.options
  );

  let diagnostics: ts.Diagnostic[] = [];

  if (filePaths.length > 0) {
    for (const filePath of filePaths) {
      const sourceFile = tsProgram.getSourceFile(filePath);
      if (!sourceFile) continue;

      diagnostics = tsProgram.emit(sourceFile).diagnostics
        .concat(ts.getPreEmitDiagnostics(tsProgram, sourceFile));
    }
  }
  else {
    diagnostics = tsProgram.emit().diagnostics
      .concat(ts.getPreEmitDiagnostics(tsProgram));
  }

  const result: string[] = [];
  for (const diagnostic of diagnostics) {
    if (diagnostic.file) {
      if (diagnostic.file.fileName.indexOf(context.replace(/\\/g, "/")) === 0) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        result.push(`${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): error: ${message}`);
      }
    }
    else {
      result.push(`error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
    }
  }

  process.send!(result);
});