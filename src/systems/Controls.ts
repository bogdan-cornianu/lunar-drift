import Phaser from 'phaser';
import { TouchControlAction, TouchControlState } from './TouchControlState';

export class Controls {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keyW: Phaser.Input.Keyboard.Key;
  private keySpace: Phaser.Input.Keyboard.Key;
  private touchControls = new TouchControlState();

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Keyboard plugin missing');
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  isLeft(): boolean {
    return this.cursors.left.isDown || this.keyA.isDown || this.touchControls.isActive('left');
  }
  isRight(): boolean {
    return this.cursors.right.isDown || this.keyD.isDown || this.touchControls.isActive('right');
  }
  isThrust(): boolean {
    return (
      this.cursors.up.isDown ||
      this.keyW.isDown ||
      this.keySpace.isDown ||
      this.touchControls.isActive('thrust')
    );
  }

  pressTouch(action: TouchControlAction, pointerId: number): void {
    this.touchControls.press(action, pointerId);
  }

  releaseTouch(action: TouchControlAction, pointerId: number): void {
    this.touchControls.release(action, pointerId);
  }

  releaseTouchPointer(pointerId: number): void {
    this.touchControls.releasePointer(pointerId);
  }

  clearTouch(): void {
    this.touchControls.clear();
  }
}
