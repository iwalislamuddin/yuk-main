import Phaser from "phaser";
import LudoScene from "./LudoScene.js";

export function createLudoGame(parent, deps) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 560,
    height: 680,
    backgroundColor: "#f7f1e3",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: new LudoScene(deps)
  });
}
