import {Injectable} from "@angular/core";
import {JsonConvert} from "@simplism/core";

@Injectable()
export class SdLocalStorageProvider {
  public prefix = "sd";

  public set(key: string, value: any): void {
    localStorage.setItem(`${this.prefix}.${key}`, JsonConvert.stringify(value) || "");
  }

  public get(key: string): any {
    const json = localStorage.getItem(`${this.prefix}.${key}`);
    if (json === null) return undefined;
    JsonConvert.parse(json);
  }

  public remove(key: string): void {
    localStorage.removeItem(key);
  }
}