export type TouchControlAction = 'left' | 'right' | 'thrust';

const TOUCH_ACTIONS: TouchControlAction[] = ['left', 'right', 'thrust'];

export class TouchControlState {
  private held = new Map<TouchControlAction, Set<number>>(
    TOUCH_ACTIONS.map((action) => [action, new Set<number>()]),
  );

  press(action: TouchControlAction, pointerId: number): void {
    this.held.get(action)?.add(pointerId);
  }

  release(action: TouchControlAction, pointerId: number): void {
    this.held.get(action)?.delete(pointerId);
  }

  releasePointer(pointerId: number): void {
    TOUCH_ACTIONS.forEach((action) => this.release(action, pointerId));
  }

  clear(): void {
    this.held.forEach((pointers) => pointers.clear());
  }

  isActive(action: TouchControlAction): boolean {
    return Boolean(this.held.get(action)?.size);
  }
}
