import Phaser from 'phaser';
import Web3 from 'web3';
import { connectWallet } from './solana/wallet';
import { loadCollectibles, registerCollectible } from './solana/nftCollector';

const LEVEL_CONFIGS = [
  { level: 1, rows: 4, cols: 7, brickColor: 0xff5555, baseBallSpeed: 220, timeLimit: 60, powerUpChance: 16, reward: 'Novice Breaker' },
  { level: 2, rows: 4, cols: 8, brickColor: 0xffa500, baseBallSpeed: 230, timeLimit: 58, powerUpChance: 17, reward: 'Heatseeker' },
  { level: 3, rows: 5, cols: 8, brickColor: 0xaa00ff, baseBallSpeed: 240, timeLimit: 56, powerUpChance: 18, reward: 'Combo Chaser' },
  { level: 4, rows: 5, cols: 9, brickColor: 0x3ee85b, baseBallSpeed: 250, timeLimit: 54, powerUpChance: 19, reward: 'Time Cadet' },
  { level: 5, rows: 5, cols: 9, brickColor: 0x00b5ff, baseBallSpeed: 260, timeLimit: 52, powerUpChance: 20, reward: 'Gap Surfer', boss: true, bossHP: 320 },
  { level: 6, rows: 6, cols: 9, brickColor: 0xff69b4, baseBallSpeed: 270, timeLimit: 50, powerUpChance: 21, reward: 'Arcade Adept' },
  { level: 7, rows: 6, cols: 10, brickColor: 0xffff66, baseBallSpeed: 280, timeLimit: 48, powerUpChance: 22, reward: 'Rush Breaker' },
  { level: 8, rows: 6, cols: 10, brickColor: 0xff6f00, baseBallSpeed: 290, timeLimit: 46, powerUpChance: 23, reward: 'Precision Pulse' },
  { level: 9, rows: 7, cols: 10, brickColor: 0x9d00ff, baseBallSpeed: 300, timeLimit: 44, powerUpChance: 24, reward: 'Surge Master' },
  { level: 10, rows: 8, cols: 10, brickColor: 0xff0077, baseBallSpeed: 310, timeLimit: 42, powerUpChance: 25, reward: 'Legend of Bricks', boss: true, bossHP: 420 },
];
const LEVEL_COUNT = LEVEL_CONFIGS.length;




class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    this.bricks = null;
    this.web3 = null;
    this.paddle = null;
    this.ball = null;
    this.score = 0;
    this.level = 1;
    this.levelIndex = 0;
    this.levelReward = '';
    this.combo = 0;
    this.maxCombo = 0;
    this.startTime = 60;
    this.timeLeft = this.startTime;
    this.timeEvent = null;
    this.isGameOver = false;
    this.endMenuContainer = null;
    this.progressBar = null;
    this.scoreText = null;
    this.timerText = null;
    this.notificationText = null;
    this.levelText = null;
    this.comboText = null;
    this.walletStatusText = null;
    this.connectButton = null;
    this.collectibleText = null;
    this.cursors = null;
    this.collectibles = [];
    this.walletPublicKey = null;
    this.rewardedMilestones = new Set();
    this.notificationEvent = null;
    this.powerUpChance = 15;
    this.ballBaseSpeed = 220;
    this.bossActive = false;
    this.bossHP = 0;
    this.bossMaxHP = 0;
    this.bossSprite = null;
    this.bossGaugeBg = null;
    this.bossGaugeFill = null;
    this.bossLabel = null;
    this.protectionTimer = null;
    this.protectionBricks = null;
    this.bossFightStarted = false;
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
    this.combo = 0;
    this.levelIndex = 0;
    this.rewardedMilestones.clear();

    this.physics.world.setBoundsCollision(true, true, true, false);
    this.bricks = this.physics.add.staticGroup();

    const textStyle = { fontSize: '28px', fill: '#ffffff' };
    this.scoreText = this.add.text(16, 16, 'Score: 0', textStyle);

    this.levelText = this.add.text(600, 16, '', {
      fontSize: '22px',
      fill: '#f5f5f5',
    });

    this.comboText = this.add.text(600, 52, 'Combo: 0', {
      fontSize: '20px',
      fill: '#ffd166',
    });

    this.timerText = this.add.text(16, 52, '', { fontSize: '22px', fill: '#f5f5f5' });

    this.notificationText = this.add
      .text(400, 90, '', { fontSize: '20px', fill: '#9ef0ff' })
      .setOrigin(0.5, 0.5);

    this.walletStatusText = this.add.text(600, 86, 'Wallet: Disconnected', {
      fontSize: '18px',
      fill: '#a1f1ff',
    });

    this.connectButton = this.add
      .text(600, 118, 'Connect Wallet', {
        fontSize: '18px',
        fill: '#0f172a',
        backgroundColor: '#c5f2ff',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    this.connectButton.on('pointerdown', () => this.handleWalletConnect());

    this.collectibleText = this.add.text(16, 520, 'NFTs: 0', {
      fontSize: '18px',
      fill: '#ffe066',
      align: 'left',
      wordWrap: { width: 360 },
    });

    this.progressBar = this.add.graphics();
    this.collectibles = loadCollectibles();
    this.refreshCollectiblePanel();

    this.applyLevelConfig();
    this.createBricks();

    this.ball = this.physics.add.sprite(400, 500, 'ball');
    this.ball.setCollideWorldBounds(true);
    this.ball.setBounce(1, 1);
    const startingSpeed = this.ballBaseSpeed;
    this.ball.setVelocity(startingSpeed, -startingSpeed);

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
    const config = this.currentLevelConfig;
    this.generateTexture('brick', 100, 32, config.brickColor);

    const rows = config.rows;
    const cols = config.cols;
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
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboText.setText(`Combo: ${this.combo}`);
    this.updateScore(10);
    this.handleComboMilestone();
    this.spawnPowerUpChance();

    if (this.bricks.countActive(true) === 0) {
      this.time.delayedCall(250, this.completeLevel, [], this);
    }
  }

  updateScore(points = 10) {
    const comboBoost = Math.floor(this.combo / 5) * 2;
    this.score += points + comboBoost;
    this.scoreText.setText(`Score: ${this.score}`);
    this.handleScoreMilestone();
  }

  spawnPowerUpChance() {
    const roll = Phaser.Math.Between(1, 100);
    if (roll <= this.powerUpChance) {
      this.applyPowerUp('Extra time', () => {
        this.timeLeft = Math.min(this.timeLeft + 5, this.startTime + 10);
      });
    } else if (roll >= 100 - Math.min(12, this.powerUpChance)) {
      this.applyPowerUp('Speed burst', () => {
        if (this.ball.body) {
          const newVelocityX = Phaser.Math.Clamp(this.ball.body.velocity.x * 1.1, -700, 700);
          const newVelocityY = Phaser.Math.Clamp(this.ball.body.velocity.y * 1.1, -700, 700);
          this.ball.setVelocity(newVelocityX, newVelocityY);
        }
      });
    }
  }

  applyPowerUp(name, effect) {
    effect?.();
    this.displayNotification(`Power-up: ${name}`);
  }

  applyLevelConfig() {
    this.level = LEVEL_CONFIGS[this.levelIndex].level;
    this.levelReward = LEVEL_CONFIGS[this.levelIndex].reward;
    this.currentLevelConfig = LEVEL_CONFIGS[this.levelIndex];
    this.startTime = this.currentLevelConfig.timeLimit;
    this.timeLeft = this.startTime;
    this.powerUpChance = this.currentLevelConfig.powerUpChance;
    this.ballBaseSpeed = this.currentLevelConfig.baseBallSpeed;
    this.levelText?.setText(`Stage ${this.level} • ${this.levelReward}`);
  }

  handleComboMilestone() {
    if (this.combo > 0 && this.combo % 10 === 0) {
      const key = `combo-${this.combo}`;
      if (!this.rewardedMilestones.has(key)) {
        this.rewardedMilestones.add(key);
        this.displayNotification(`Combo x${this.combo}!`);
        this.recordCollectible(`Combo streak x${this.combo}`);
      }
    }
  }

  handleScoreMilestone() {
    const milestone = this.level * 400;
    const key = `score-${milestone}`;
    if (this.score >= milestone && !this.rewardedMilestones.has(key)) {
      this.rewardedMilestones.add(key);
      this.displayNotification(`Reached ${milestone} points!`);
      this.recordCollectible(`Score ${milestone} reached`);
    }
  }

  resetBall() {
    if (!this.ball) {
      return;
    }
    this.ball.setPosition(this.scale.width / 2, 500);
    this.ball.setVelocity(this.ballBaseSpeed, -this.ballBaseSpeed);
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
    this.displayNotification(message, 2600);
    this.timeEvent?.remove(false);
    this.timeEvent = null;
    this.physics.world.pause();
    if (this.ball) {
      this.ball.setVelocity(0);
    }
    if (this.paddle) {
      this.paddle.setVelocity(0);
    }
    this.combo = 0;
    this.comboText?.setText('Combo: 0');
    this.showEndMenu(message);
  }

  displayNotification(message, duration = 2200) {
    if (this.notificationEvent) {
      this.notificationEvent.remove(false);
    }
    this.notificationText?.setText(message);
    this.notificationEvent = this.time.delayedCall(duration, () => {
      this.notificationText?.setText('');
    });
  }

  refreshCollectiblePanel() {
    const preview = this.collectibles
      .slice(-3)
      .map((collectible, index) => `${index + 1}. ${collectible.reason}`)
      .join('\n');
    this.collectibleText?.setText(
      `NFTs: ${this.collectibles.length}\n${preview || 'Collect special drops to log NFTs.'}`
    );
  }

  async handleWalletConnect() {
    const publicKey = await connectWallet();
    if (!publicKey) {
      this.displayNotification('Wallet connection failed.');
      return;
    }

    this.walletPublicKey = publicKey.toString();
    const shortKey = `${this.walletPublicKey.slice(0, 6)}...${this.walletPublicKey.slice(-4)}`;
    this.walletStatusText.setText(`Wallet: ${shortKey}`);
    this.collectibles = loadCollectibles();
    this.refreshCollectiblePanel();
    this.displayNotification('Wallet linked! NFT rewards synced.');
  }

  async recordCollectible(reason) {
    if (!this.walletPublicKey) {
      this.displayNotification('Connect wallet to log NFT rewards.');
      return;
    }

    try {
      this.collectibles = await registerCollectible({
        owner: this.walletPublicKey,
        level: this.level,
        score: this.score,
        reason,
      });
      this.refreshCollectiblePanel();
      this.displayNotification('NFT reward logged! Check the panel.');
    } catch (error) {
      console.error('Unable to register collectible', error);
      this.displayNotification('Failed to register NFT reward.');
    }
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

    const nftText = this.add
      .text(400, 330, `NFTs Collected: ${this.collectibles.length}`, {
        fontSize: '22px',
        fill: '#9ef0ff',
      })
      .setOrigin(0.5);

    const restartButton = this.add
      .text(400, 380, 'Restart', {
        fontSize: '24px',
        fill: '#000000',
        backgroundColor: '#ffffff',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    restartButton.on('pointerdown', () => this.restartGame());

    this.endMenuContainer = this.add.container(0, 0, [overlay, title, scoreText, nftText, restartButton]);
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

    if (this.levelIndex >= LEVEL_COUNT - 1) {
      this.recordCollectible(`Completed all ${LEVEL_COUNT} levels`);
      this.endGame('Champion of the Bricks!');
      return;
    }

    const finishedLevel = LEVEL_CONFIGS[this.levelIndex].level;
    this.levelIndex += 1;
    this.combo = 0;
    this.comboText?.setText('Combo: 0');
    this.rewardedMilestones.clear();

    this.displayNotification(`Stage ${LEVEL_CONFIGS[this.levelIndex].level} unlocked!`);
    this.applyLevelConfig();
    this.createBricks();
    this.resetBall();
    this.resetTimer();
    this.recordCollectible(`Cleared stage ${finishedLevel}`);
  }
}

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
      debug: false,
    },
  },
};

// Create the game instance
const game = new Phaser.Game(config);
