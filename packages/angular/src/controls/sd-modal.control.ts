import {Component, EventEmitter, HostBinding, HostListener, Input} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";

@Component({
  selector: "sd-modal",
  template: `
    <div class="_backdrop" (click)="onBackdropClick()"></div>
    <div class="_dialog" tabindex="0">
      <sd-dock-container>
        <sd-dock class="_header">
          <h5 class="_title">{{ title }}</h5>
          <a class="_close-button"
             (click)="onCloseButtonClick()"
             *ngIf="!hideCloseButton">
            <sd-icon [icon]="'times'" [fixedWidth]="true"></sd-icon>
          </a>
        </sd-dock>

        <sd-pane class="_content">
          <ng-content></ng-content>
        </sd-pane>
      </sd-dock-container>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: absolute;
      z-index: $z-modal;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      text-align: center;
      padding-top: 25px;

      > ._backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, .6);
      }

      > ._dialog {
        position: relative;
        display: inline-block;
        text-align: left;
        margin: 0 auto;
        background: get($theme-color, bluegrey, darkest);
        overflow: hidden;
        max-width: 100%;
        min-width: 240px;
        max-height: calc(100% - 50px);
        border: 1px solid get($trans-color, default);

        &:focus {
          outline: none;
        }

        > sd-dock-container {
          > ._header {
            > ._title {
              display: inline-block;
              padding: gap(sm) gap(default);
            }

            > ._close-button {
              float: right;
              cursor: pointer;
              text-align: center;
              padding: gap(sm) gap(default);

              &:hover {
                background: rgba(0, 0, 0, .1);
              }

              &:active {
                background: rgba(0, 0, 0, .2);
              }
            }
          }
        }
      }

      opacity: 0;
      transition: opacity .3s ease-in-out;
      pointer-events: none;
      > ._dialog {
        transform: translateY(-25px);
        transition: transform .3s ease-in-out;
      }

      &[sd-open=true] {
        opacity: 1;
        pointer-events: auto;
        > ._dialog {
          transform: none;
        }
      }
    }
  `]
})
export class SdModalControl {
  @Input()
  @SdTypeValidate({type: String, notnull: true})
  public title!: string;

  @Input()
  @SdTypeValidate(Boolean)
  public hideCloseButton?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  public close = new EventEmitter<any>();

  public onBackdropClick(): void {
    if (this.hideCloseButton) {
      return;
    }

    this.onCloseButtonClick();
  }

  public onCloseButtonClick(): void {
    this.open = false;
    this.close.emit();
  }

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (this.hideCloseButton) {
      return;
    }

    if (event.key === "Escape") {
      this.onCloseButtonClick();
    }
  }
}