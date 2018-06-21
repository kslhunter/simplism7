import {ApplicationRef, ComponentFactoryResolver, Injectable, Injector} from "@angular/core";
import {Exception, Type} from "../../../core/src";
import {SdModalControl} from "..";

export abstract class SdModalBase<P, R> {
  public _tParam!: P;
  public _tResult!: R;

  public abstract sdOnOpen(param: P): Promise<void>;

  public close: (value?: R) => void = (value?: R) => {
    throw new Exception("모달이 초기화되어있지 않습니다.");
  };
}

export interface IModalOption {
  hideCloseButton?: boolean;
}

@Injectable()
export class SdModalProvider {
  public constructor(private readonly _cfr: ComponentFactoryResolver,
                     private readonly _injector: Injector,
                     private readonly _appRef: ApplicationRef) {
  }

  public async show<T extends SdModalBase<any, any>>(modalType: Type<T>, title: string, param: T["_tParam"], option?: IModalOption): Promise<T["_tResult"]> {
    return await new Promise<T["_tResult"]>(async resolve => {
      const compRef = this._cfr.resolveComponentFactory(modalType).create(this._injector);
      const rootComp = this._appRef.components[0];
      const rootCompEl = rootComp.location.nativeElement as HTMLElement;

      const modalRef = this._cfr.resolveComponentFactory(SdModalControl).create(
        this._injector,
        [[compRef.location.nativeElement]]
      );
      const modalEl = modalRef.location.nativeElement as HTMLElement;
      rootCompEl.appendChild(modalEl);

      const activeElement = document.activeElement as HTMLElement | undefined;
      const close = async (value?: any) => {
        resolve(value);

        modalEl.addEventListener("transitionend", () => {
          compRef.destroy();
          modalRef.destroy();
        });
        modalRef.instance.open = false;

        if (activeElement) {
          activeElement.focus();
        }
      };

      modalRef.instance.title = title;
      modalRef.instance.hideCloseButton = option && option.hideCloseButton;
      modalRef.instance.close.subscribe(async () => {
        await close();
      });

      compRef.instance.close = close.bind(this);

      this._appRef.attachView(compRef.hostView);
      this._appRef.attachView(modalRef.hostView);

      try {
        if (activeElement) {
          activeElement.blur();
        }
        this._appRef.tick();
        modalRef.instance.open = true;
        await compRef.instance.sdOnOpen(param);
      }
      catch (e) {
        await close();
        throw e;
      }
    });
  }
}