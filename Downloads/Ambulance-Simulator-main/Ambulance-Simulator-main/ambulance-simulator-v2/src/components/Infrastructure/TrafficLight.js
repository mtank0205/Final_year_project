// Traffic Light component with animations
import * as PIXI from 'pixi.js';

export class TrafficLight {
  constructor(app, intersection, id) {
    this.app = app;
    this.intersection = intersection;
    this.id = id;
    this.container = new PIXI.Container();

    // Validate intersection
    if (!intersection || intersection.x === undefined || intersection.y === undefined) {
      console.error('Invalid intersection for traffic light', id);
      this.container.x = 0;
      this.container.y = 0;
    } else {
      this.container.x = intersection.x;
      this.container.y = intersection.y;
    }

    this.state = 'red'; // red, yellow, green
    this.countdown = 0;
    this.isEmergencyMode = false;
    this.destroyed = false;

    this.init();
  }

  init() {
    // Traffic light pole
    const pole = new PIXI.Graphics();
    pole.beginFill(0x333333);
    pole.drawRect(-5, 0, 10, 40);
    pole.endFill();
    this.container.addChild(pole);

    // Traffic light box
    const box = new PIXI.Graphics();
    box.beginFill(0x222222);
    box.drawRoundedRect(-15, -50, 30, 45, 5);
    box.endFill();
    this.container.addChild(box);

    // Create light circles
    this.redLight = this.createLight(0xFF0000, -35);
    this.yellowLight = this.createLight(0xFFFF00, -20);
    this.greenLight = this.createLight(0x00FF00, -5);

    this.container.addChild(this.redLight);
    this.container.addChild(this.yellowLight);
    this.container.addChild(this.greenLight);

    // Countdown text
    this.countdownText = new PIXI.Text('', {
      fontFamily: 'Arial',
      fontSize: 16,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      align: 'center'
    });
    this.countdownText.anchor.set(0.5);
    this.countdownText.x = 0;
    this.countdownText.y = -70;
    this.container.addChild(this.countdownText);

    this.updateLights();
  }

  createLight(color, yOffset) {
    const light = new PIXI.Graphics();
    light.beginFill(color, 0.3); // Dim by default
    light.drawCircle(0, yOffset, 8);
    light.endFill();
    return light;
  }

  updateLights() {
    if (this.destroyed) return;

    // Safety check - if container is missing, abort
    if (!this.container) return;

    // Reinitialize lights if they became null
    if (!this.redLight) {
      this.redLight = this.createLight(0xFF0000, -35);
      this.container.addChild(this.redLight);
    }
    if (!this.yellowLight) {
      this.yellowLight = this.createLight(0xFFFF00, -20);
      this.container.addChild(this.yellowLight);
    }
    if (!this.greenLight) {
      this.greenLight = this.createLight(0x00FF00, -5);
      this.container.addChild(this.greenLight);
    }

    // Safety check - if lights are still missing, abort
    if (!this.redLight || !this.yellowLight || !this.greenLight) {
      return;
    }

    // Clear all lights safely with try-catch to handle PIXI internal errors
    try {
      if (this.redLight && typeof this.redLight.clear === 'function') {
        this.redLight.clear();
      }
    } catch (error) {
      console.warn('Error clearing red light, recreating:', error);
      this.redLight = this.createLight(0xFF0000, -35);
      if (this.container) this.container.addChild(this.redLight);
    }

    try {
      if (this.yellowLight && typeof this.yellowLight.clear === 'function') {
        this.yellowLight.clear();
      }
    } catch (error) {
      console.warn('Error clearing yellow light, recreating:', error);
      this.yellowLight = this.createLight(0xFFFF00, -20);
      if (this.container) this.container.addChild(this.yellowLight);
    }

    try {
      if (this.greenLight && typeof this.greenLight.clear === 'function') {
        this.greenLight.clear();
      }
    } catch (error) {
      console.warn('Error clearing green light, recreating:', error);
      this.greenLight = this.createLight(0x00FF00, -5);
      if (this.container) this.container.addChild(this.greenLight);
    }

    // Draw lights based on state with error handling
    try {
      switch (this.state) {
        case 'red':
          if (this.redLight) {
            this.redLight.beginFill(0xFF0000, 1);
            this.redLight.drawCircle(0, -35, 8);
            this.redLight.endFill();
          }
          break;

        case 'yellow':
          if (this.yellowLight) {
            this.yellowLight.beginFill(0xFFFF00, 1);
            this.yellowLight.drawCircle(0, -20, 8);
            this.yellowLight.endFill();
          }
          break;

        case 'green':
          if (this.greenLight) {
            this.greenLight.beginFill(0x00FF00, 1);
            this.greenLight.drawCircle(0, -5, 8);
            this.greenLight.endFill();
          }
          break;

        default:
          break;
      }

      // Draw dim lights for inactive states
      if (this.state !== 'red' && this.redLight) {
        this.redLight.beginFill(0xFF0000, 0.3);
        this.redLight.drawCircle(0, -35, 8);
        this.redLight.endFill();
      }
      if (this.state !== 'yellow' && this.yellowLight) {
        this.yellowLight.beginFill(0xFFFF00, 0.3);
        this.yellowLight.drawCircle(0, -20, 8);
        this.yellowLight.endFill();
      }
      if (this.state !== 'green' && this.greenLight) {
        this.greenLight.beginFill(0x00FF00, 0.3);
        this.greenLight.drawCircle(0, -5, 8);
        this.greenLight.endFill();
      }
    } catch (error) {
      console.warn('Error drawing traffic lights:', error);
    }
  }

  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.updateLights();
    }
  }

  setCountdown(seconds) {
    if (!this.countdownText) return;

    this.countdown = seconds;
    if (seconds > 0) {
      this.countdownText.text = `${seconds}s`;
      this.countdownText.visible = true;
    } else {
      this.countdownText.visible = false;
    }
  }

  setEmergencyMode(isEmergency) {
    this.isEmergencyMode = isEmergency;
  }

  update(delta) {
    // Pulsing animation for active light
    if (this.state !== 'red') {
      const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8;
      if (this.state === 'yellow' && this.yellowLight) {
        this.yellowLight.alpha = pulse;
      } else if (this.state === 'green' && this.greenLight) {
        this.greenLight.alpha = pulse;
      }
    }
  }

  getContainer() {
    return this.container;
  }

  getState() {
    return this.state;
  }

  getIntersectionId() {
    return this.intersection.id;
  }

  destroy() {
    this.destroyed = true;
    if (this.container) {
      this.container.destroy({ children: true });
    }
  }
}

export default TrafficLight;
