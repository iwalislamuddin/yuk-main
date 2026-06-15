import Phaser from "phaser";
import HalmaScene from "./HalmaScene.js";

export function createHalmaGame(parent, deps) {
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
    scene: new HalmaScene(deps)
  });
}
