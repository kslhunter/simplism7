import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-sidebar",
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
      width: 200px;
      height: 100%;
      background: theme-color(bluegrey, darkest);
      border-left: 1px solid get($trans-color, default);
      border-right: 1px solid get($trans-color, dark);
    }
  `]
})
export class SdSidebarControl {
}