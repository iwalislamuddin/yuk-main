import Phaser from "phaser";
import SnakesLaddersScene from "./SnakesLaddersScene.js";

export function createSnakesLaddersGame(parent, deps) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 520,
    height: 644,
    backgroundColor: "#f7f1e3",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: new SnakesLaddersScene(deps)
  });
}
