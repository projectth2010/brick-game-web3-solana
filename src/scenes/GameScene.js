export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.load.image('sky', 'assets/sky.png');
    }

    create() {
        this.add.image(400, 300, 'sky');
    }

    update() {
        // Game logic goes here
    }
}
