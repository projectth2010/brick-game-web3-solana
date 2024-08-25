import Phaser from 'phaser';
import Web3 from 'web3';




class Brick extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, hits) {
      super(scene, x, y, texture);
      scene.add.existing(this);
      scene.physics.add.existing(this);
      this.hits = hits; // Number of hits required to break
    }
  
    hit() {
      this.hits--;
      if (this.hits <= 0) {
        this.destroy();
        return true; // Brick destroyed
      }
      return false; // Brick not yet destroyed
    }
  }

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  
    this.bricks = null;
    this.web3 = null;
    this.provider = null;
    this.paddle = null;
    this.ball = null;
    this.bricks = null;
    this.score = 0;
    this.timeLeft = 100;
  }

  async init() {
    // Initialize Web3
    await this.setupWeb3();
  }

  async setupWeb3() {
    if (window.ethereum) {
      try {
        // Request account access if needed
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create a new Web3 instance
        this.web3 = new Web3(window.ethereum);

        // Log account details for demonstration
        const accounts = await this.web3.eth.getAccounts();
        console.log('Connected account:', accounts[0]);

        // Optionally set up event listeners for MetaMask account changes
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
    this.load.image('brick', 'path/to/brick.png');
    this.load.image('ball', 'path/to/ball.png');
    this.load.image('paddle', 'path/to/paddle.png');
  }

  create() {
    // Create game objects
    this.bricks = this.physics.add.staticGroup();
    this.ball = this.physics.add.sprite(400, 500, 'ball');
    this.paddle = this.physics.add.sprite(400, 550, 'paddle');

    // Create bricks
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        this.bricks.create(100 + i * 150, 100 + j * 50, 'brick');
      }
    }

    // Set up physics
    this.ball.setBounce(1);
    this.ball.setCollideWorldBounds(true);
    this.ball.setVelocity(200, -200);

    this.paddle.setImmovable(true);
    this.physics.add.collider(this.ball, this.paddle);
    this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);

    // Control paddle
    this.input.on('pointermove', pointer => {
      this.paddle.x = Phaser.Math.Clamp(pointer.x, 50, 750);
    });

    // Initialize score display
    this.scoreText = this.add.text(16, 16, `Score: ${this.score}`, {
      fontSize: '32px',
      fill: '#fff'
    });

    this.timeLeft = 100; // Starting time
    this.progressBar = this.add.graphics();
    this.timeEvent = this.time.addEvent({
        delay: 100, // 100ms updates
        callback: this.updateTimer,
        callbackScope: this,
        loop: true
    });
  }

  update() {
    // Example: Handle ball and paddle interactions
    if (this.ball.y > this.sys.canvas.height) {
      // Game Over: Ball has fallen below the screen
      this.gameOver();
    }

    // Example: Update paddle position based on user input
    const cursors = this.input.keyboard.createCursorKeys();

    if (cursors.left.isDown) {
      this.paddle.setVelocityX(-300);
    } else if (cursors.right.isDown) {
      this.paddle.setVelocityX(300);
    } else {
      this.paddle.setVelocityX(0);
    }
    
    // Example: Check if the ball hits the top of the screen and reverse direction
    if (this.ball.y < 0) {
      this.ball.setVelocityY(Math.abs(this.ball.body.velocity.y));
    }
    
    // Optional: Update score or any other game-related logic

    this.timeLeft--;

    // Update progress bar
    this.progressBar.clear();
    this.progressBar.fillStyle(0xff0000, 1);
    this.progressBar.fillRect(20, 20, (this.timeLeft / 100) * 300, 20);
  
    if (this.timeLeft <= 0) {
      this.failLevel();
    }

  }

  createBricks() {
    this.bricks.clear(true, true); // Remove old bricks
  
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        let hits = Phaser.Math.Between(1, 3); // Random hit points for each brick
        let brick = new Brick(this, 100 + i * 150, 100 + j * 50, 'brick', hits);
        this.bricks.add(brick);
      }
    }
  }

  failLevel() {
    // Pause the game and show the fail menu
    this.scene.pause();
    this.showFailMenu();
  }
  
  showFailMenu() {
    const failText = this.add.text(400, 300, 'You Failed!', {
      fontSize: '32px',
      fill: '#fff'
    }).setOrigin(0.5);
  
    const restartButton = this.add.text(400, 350, 'Restart', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#000'
    }).setOrigin(0.5).setInteractive();
  
    restartButton.on('pointerdown', () => {
      this.scene.restart(); // Restart the level
    });
  
    const titleButton = this.add.text(400, 400, 'Go to Title', {
      fontSize: '24px',
      fill: '#fff',
      backgroundColor: '#000'
    }).setOrigin(0.5).setInteractive();
  
    titleButton.on('pointerdown', () => {
      this.scene.start('TitleScene'); // Go to the title scene
    });
  }

  completeLevel() {
    // Create a new layout for the next level
    this.createBricks();
  
    // Reset the timer
    this.timeLeft = 100;
  }
  
  gameOver() {
    // Handle game over logic
    this.add.text(400, 300, 'Game Over', {
      fontSize: '32px',
      fill: '#fff'
    }).setOrigin(0.5);
    
    // Stop the game or restart
    this.scene.pause();
  }

  hitBrick(ball, brick) {
    brick.destroy();
    ball.setVelocityY(-ball.body.velocity.y);
    this.updateScore(); // Update score when hitting a brick
  }

  updateScore() {
    this.score += 10; // Example score increment
    this.scoreText.setText(`Score: ${this.score}`);
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
