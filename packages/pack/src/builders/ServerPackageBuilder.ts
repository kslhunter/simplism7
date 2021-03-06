import * as fs from "fs-extra";
import * as path from "path";
import * as child_process from "child_process";
import * as glob from "glob";
import {IServerPackageConfig} from "../commons/IProjectConfig";
import {Logger} from "@simplism/core";
import {FtpStorage} from "@simplism/storage";
import {FriendlyLoggerPlugin} from "../plugins/FriendlyLoggerPlugin";
import * as webpack from "webpack";
import * as webpackMerge from "webpack-merge";
import {TsLintPlugin} from "../plugins/TsLintPlugin";
import {TsCheckAndDeclarationPlugin} from "../plugins/TsCheckAndDeclarationPlugin";

export class ServerPackageBuilder {
  private readonly _logger = new Logger("@simplism/pack", `ServerPackageBuilder`, `${this._config.name}:`);

  private get _packageName(): string {
    return this._config.name.includes(":") ? this._config.name.slice(0, this._config.name.indexOf(":")) : this._config.name;
  }

  public constructor(private readonly _config: IServerPackageConfig) {
  }

  public async buildAsync(): Promise<void> {
    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    fs.removeSync(this._packagePath(tsconfig.compilerOptions.outDir || "dist"));

    await new Promise<void>((resolve, reject) => {
      const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(), {
        mode: "production",
        devtool: "source-map",
        optimization: {
          noEmitOnErrors: true,
          minimize: false
        }
      });

      webpack(webpackConfig, err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  public async watchAsync(): Promise<void> {
    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    fs.removeSync(this._packagePath(tsconfig.compilerOptions.outDir || "dist"));

    await new Promise<void>((resolve, reject) => {
      const webpackConfig: webpack.Configuration = webpackMerge(this._getCommonConfig(), {
        mode: "development",
        devtool: "inline-source-map"
      });

      const compiler = webpack(webpackConfig);

      let worker: child_process.ChildProcess;
      compiler.watch({}, err => {
        if (err) {
          reject(err);
          return;
        }

        if (worker) {
          worker.kill();
        }
        worker = child_process.fork(this._packagePath(tsconfig.compilerOptions.outDir || "dist", "app.js"), [], {
          cwd: this._packagePath(tsconfig.compilerOptions.outDir || "dist"),
          execArgv: ["--require", "source-map-support/register"]
        });

        resolve();
      });
    });
  }

  public async publishAsync(): Promise<void> {
    this._logger.log(`배포...`);

    if (!this._config.publish) {
      throw new Error("설정파일에 'publish'옵션이 설정되어야 합니다.");
    }

    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));
    const distPath = this._packagePath(tsconfig.compilerOptions.outDir || "dist");

    // 배포
    const storage = new FtpStorage();
    await storage.connectAsync({
      host: this._config.publish.host,
      port: this._config.publish.port,
      user: this._config.publish.username,
      password: this._config.publish.password
    });

    // 루트 디렉토리 생성
    await storage.mkdirAsync(this._config.publish.path);

    // 로컬 파일 전송
    const filePaths = glob.sync(path.resolve(distPath, "**/*"));
    for (const filePath of filePaths) {
      const ftpFilePath = `${this._config.publish.path}/${path.relative(distPath, filePath).replace(/\\/g, "/")}`;
      if (fs.lstatSync(filePath).isDirectory()) {
        await storage.mkdirAsync(ftpFilePath);
      }
      else {
        await storage.putAsync(filePath, ftpFilePath);
      }
    }

    await storage.putAsync(this._packagePath("package.json"), this._config.publish.path + "/package.json");

    // pm2.json 전송
    await storage.putAsync(
      Buffer.from(
        JSON.stringify(
          {
            apps: [{
              name: this._config.publish.path.replace(/[\\/]/g, "."),
              script: "./app.js",
              watch: [
                "app.js",
                "pm2.json"
              ],
              env: {
                NODE_ENV: "production",
                ...this._config.env
              }
            }]
          },
          undefined,
          2
        )
      ),
      `/${this._config.publish.path}/pm2.json`
    );

    await storage.closeAsync();

    // 완료
    const rootPackageJson = fs.readJsonSync(this._projectPath("package.json"));
    this._logger.info(`배포 완료: v${rootPackageJson.version}`);
  }

  private _getCommonConfig(): webpack.Configuration {
    const tsconfig = fs.readJsonSync(this._packagePath("tsconfig.json"));

    return {
      target: "node",
      resolve: {
        extensions: [".ts", ".js", ".json"],
        alias: {
          bindings: this._loadersPath("bindings.js")
        }
      },
      entry: this._packagePath("src/app.ts"),
      output: {
        path: this._packagePath(tsconfig.compilerOptions.outDir || "dist"),
        filename: "app.js"
      },
      module: {
        rules: [
          {
            enforce: "pre",
            test: /\.js$/,
            use: ["source-map-loader"],
            include: /node_modules[\\/]@simplism/
          },
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            loader: this._loadersPath("ts-transpile-loader.js"),
            options: {
              logger: this._logger
            }
          },
          {
            test: /\.node$/,
            loader: this._loadersPath("node-loader.js")
          },
          {
            test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico|otf)$/,
            loader: "file-loader",
            options: {
              name: "assets/[name].[ext]?[hash]"
            }
          }
        ]
      },
      plugins: [
        new TsCheckAndDeclarationPlugin({
          packageName: this._packageName,
          logger: this._logger
        }),
        new TsLintPlugin({
          packageName: this._packageName,
          logger: this._logger
        }),
        new FriendlyLoggerPlugin({
          packageName: this._packageName,
          logger: this._logger
        }),
        new webpack.DefinePlugin({
          "process.env": this._envStringify({
            ...this._config.env
          })
        })
      ]
    };
  }

  private _envStringify(param: { [key: string]: string | undefined }): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    for (const key of Object.keys(param)) {
      result[key] = param[key] === undefined ? "undefined" : JSON.stringify(param[key]);
    }
    return result;
  }

  private _loadersPath(...args: string[]): string {
    return fs.existsSync(path.resolve(process.cwd(), "node_modules/@simplism/pack/loaders"))
      ? path.resolve(process.cwd(), "node_modules/@simplism/pack/loaders", ...args)
      : path.resolve(__dirname, "../../loaders", ...args);
  }

  private _projectPath(...args: string[]): string {
    return path.resolve(process.cwd(), ...args);
  }

  private _packagePath(...args: string[]): string {
    return path.resolve(process.cwd(), `packages/${this._packageName}`, ...args);
  }
}
