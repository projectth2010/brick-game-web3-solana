import Phaser from 'phaser';
import Web3 from 'web3';




class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    this.bricks = null;
    this.web3 = null;
    this.provider = null;
    this.paddle = null;
    this.ball = null;
    this.score = 0;
    this.startTime = 60;
    this.timeLeft = this.startTime;
    this.timeEvent = null;
    this.isGameOver = false;
    this.endMenuContainer = null;
    this.progressBar = null;
    this.scoreText = null;
    this.timerText = null;
    this.cursors = null;
  }

  async init() {
    await this.setupWeb3();
  }

  async setupWeb3() {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.web3 = new Web3(window.ethereum);
        const accounts = await this.web3.eth.getAccounts();
        console.log('Connected account:', accounts[0]);

        window.ethereum.on('accountsChanged', (accounts) => {
          console.log('Accounts changed:', accounts);
        });

        window.ethereum.on('chainChanged', (chainId) => {
          console.log('Network changed:', chainId);
        });
      } catch (error) {
        console.error('User denied account access or other error:', error);
      }
    } else {
      console.error('MetaMask is not installed!');
    }
  }

  preload() {
    this.generateTexture('brick', 100, 32, 0xff5555);
    this.generateTexture('paddle', 120, 24, 0x00b5ff);
    this.generateCircleTexture('ball', 12, 0xffffff);
  }

  create() {
    this.isGameOver = false;
    this.score = 0;
    this.timeLeft = this.startTime;

    this.physics.world.setBoundsCollision(true, true, true, false);
    this.bricks = this.physics.add.staticGroup();
    this.createBricks();

    this.ball = this.physics.add.sprite(400, 500, 'ball');
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(1, 1);
    this.ball.setVelocity(220, -220);

    this.paddle = this.physics.add.sprite(400, 550, 'paddle');
    this.paddle.setImmovable(true);
    this.paddle.setCollideWorldBounds(true);
    this.paddle.body.setAllowGravity(false);

    this.physics.add.collider(this.ball, this.paddle);
    this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();

    this.input.on('pointermove', (pointer) => {
      this.paddle.x = Phaser.Math.Clamp(pointer.x, 80, 720);
    });

    const textStyle = { fontSize: '28px', fill: '#ffffff' };
    this.scoreText = this.add.text(16, 16, 'Score: 0', textStyle);
    this.timerText = this.add.text(16, 52, '', { fontSize: '22px', fill: '#f5f5f5' });
    this.progressBar = this.add.graphics();

    this.resetTimer();
    this.updateTimerDisplay();
  }

  update() {
    if (this.isGameOver) {
      return;
    }

    if (this.ball.y > this.scale.height) {
      this.gameOver();
      return;
    }

    this.handlePaddleMovement();
  }

  handlePaddleMovement() {
    const speed = 500;
    if (this.cursors.left.isDown) {
      this.paddle.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.paddle.setVelocityX(speed);
    } else {
      this.paddle.setVelocityX(0);
    }
  }

  generateTexture(key, width, height, color) {
    const gfx = this.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillRect(0, 0, width, height);
    gfx.generateTexture(key, width, height);
    gfx.destroy();
  }

  generateCircleTexture(key, radius, color) {
    const diameter = radius * 2;
    const gfx = this.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillCircle(radius, radius, radius);
    gfx.generateTexture(key, diameter, diameter);
    gfx.destroy();
  }

  createBricks() {
    this.bricks.clear(true, true);
    const rows = 4;
    const cols = 8;
    const startX = 80;
    const startY = 120;
    const offsetX = 90;
    const offsetY = 50;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const brick = this.bricks.create(
          startX + col * offsetX,
          startY + row * offsetY,
          'brick'
        );
        brick.setOrigin(0.5);
        brick.refreshBody();
      }
    }
  }

  hitBrick(ball, brick) {
    brick.disableBody(true, true);
    this.updateScore(10);
    if (this.bricks.countActive(true) === 0) {
      this.time.delayedCall(250, this.completeLevel, [], this);
    }
  }

  updateScore(points = 10) {
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);
  }

  resetBall() {
    this.ball.setPosition(this.scale.width / 2, 500);
    this.ball.setVelocity(220, -220);
    this.physics.world.resume();
  }

  resetTimer() {
    this.timeEvent?.remove(false);
    this.timeLeft = this.startTime;
    this.timeEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
    this.updateTimerDisplay();
  }

  updateTimer() {
    if (this.isGameOver) {
      return;
    }

    this.timeLeft = Math.max(this.timeLeft - 1, 0);
    this.updateTimerDisplay();

    if (this.timeLeft <= 0) {
      this.failLevel();
    }
  }

  updateTimerDisplay() {
    const percent = Phaser.Math.Clamp(this.timeLeft / this.startTime, 0, 1);
    const maxWidth = 300;
    const barWidth = maxWidth * percent;
    this.progressBar.clear();
    this.progressBar.fillStyle(0x28c76f, 0.9);
    this.progressBar.fillRect(20, 20, barWidth, 18);
    this.progressBar.lineStyle(2, 0xffffff);
    this.progressBar.strokeRect(20, 20, maxWidth, 18);
    this.timerText.setText(`Time: ${this.timeLeft}s`);
  }

  failLevel() {
    this.endGame('Time ran out!');
  }

  gameOver() {
    this.endGame('Game Over');
  }

  endGame(message) {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.timeEvent?.remove(false);
    this.timeEvent = null;
    this.physics.world.pause();
    if (this.ball) {
      this.ball.setVelocity(0);
    }
    if (this.paddle) {
      this.paddle.setVelocity(0);
    }
    this.showEndMenu(message);
  }

  showEndMenu(message) {
    if (this.endMenuContainer) {
      this.endMenuContainer.destroy();
    }

    const overlay = this.add.rectangle(400, 300, this.scale.width, this.scale.height, 0x000000, 0.6);
    const title = this.add
      .text(400, 240, message, {
        fontSize: '36px',
        fill: '#ffffff',
      })
      .setOrigin(0.5);

    const scoreText = this.add
      .text(400, 290, `Final Score: ${this.score}`, {
        fontSize: '28px',
        fill: '#ffe066',
      })
      .setOrigin(0.5);

    const restartButton = this.add
      .text(400, 360, 'Restart', {
        fontSize: '24px',
        fill: '#000000',
        backgroundColor: '#ffffff',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    restartButton.on('pointerdown', () => this.restartGame());

    this.endMenuContainer = this.add.container(0, 0, [overlay, title, scoreText, restartButton]);
  }

  restartGame() {
    this.physics.world.resume();
    this.endMenuContainer?.destroy();
    this.endMenuContainer = null;
    this.scene.restart();
  }

  completeLevel() {
    if (this.isGameOver) {
      return;
    }

    this.createBricks();
    this.resetBall();
    this.resetTimer();
  }
}

// Game configuration
// const config = {
//   type: Phaser.AUTO,
//   width: 800,
//   height: 600,
//   backgroundColor: '#000',
//   scene: GameScene
// };

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000',
    scene: GameScene,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    }
  };

// Create the game instance
const game = new Phaser.Game(config);
