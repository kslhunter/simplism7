export class Wait {
  public static async true(forwarder: () => boolean | PromiseLike<boolean>): Promise<void> {
    while (true) {
      if (await forwarder()) {
        break;
      }
      await this.time(100);
    }
  }

  public static async time(millisecond: number = 0): Promise<void> {
    await new Promise<void>(resolve => {
      setTimeout(
        () => resolve(),
        millisecond
      );
    });
  }
}