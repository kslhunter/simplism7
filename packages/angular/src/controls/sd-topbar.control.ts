import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 32px;
      line-height: 32px;
      background: theme-color(bluegrey, darkest);
      padding: 0 gap(default);

      /deep/ > * {
        float: left;
        line-height: 32px;
      }

      /deep/ > h1,
      /deep/ > h2,
      /deep/ > h3,
      /deep/ > h4,
      /deep/ > h5,
      /deep/ > h6 {
        padding-right: gap(default);
      }
    }
  `]
})
export class SdTopbarControl {
}