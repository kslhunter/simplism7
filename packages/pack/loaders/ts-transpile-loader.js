const loaderUtils = require("loader-utils");
const ts = require("typescript");
const path = require("path");
const fs = require("fs-extra");

function loader(content) {
  if (this.cacheable) {
    this.cacheable();
  }

  const options = loaderUtils.getOptions(this) || {};

  const resourcePath = this.resourcePath.replace(/\\/g, "/");

  const resourceDirPath = path.dirname(resourcePath);
  const configPath = options.tsConfigPath || ts.findConfigFile(resourceDirPath, ts.sys.fileExists, "tsconfig.json");
  const contextPath = path.dirname(configPath).replace(/\\/g, "/");

  const parsedConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(configPath), ts.sys, path.dirname(configPath));
  parsedConfig.options.outDir = parsedConfig.options.outDir || path.resolve(path.dirname(configPath), "dist");

  const result = ts.transpileModule(content, {
    compilerOptions: parsedConfig.options,
    reportDiagnostics: false
  });

  const sourceMap = JSON.parse(result.sourceMapText);
  const fileRelativePath = path.relative(contextPath, resourcePath);
  sourceMap.sources = [fileRelativePath];
  sourceMap.file = fileRelativePath;
  sourceMap.sourcesContent = [content];

  this.callback(undefined, result.outputText, sourceMap);
}

module.exports = loader;