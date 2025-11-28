// Ambulance vehicle class with animations
import * as PIXI from 'pixi.js';
import { moveTowards, angleBetween, distance } from '../../utils/physics';

export class Ambulance {
  constructor(app, config, route) {
    this.app = app;
    this.id = config.id;
    this.name = config.name;
    this.color = config.color;
    this.baseSpeed = config.speed;
    this.currentSpeed = 0;

    // Validate route
    if (!route || route.length === 0) {
      console.error('Ambulance route is empty or invalid');
      this.route = [{ x: 0, y: 0, intersectionId: 1 }];
    } else {
      this.route = route;
    }

    this.currentWaypointIndex = 0;

    // Ensure position is always initialized
    if (this.route[0] && typeof this.route[0].x === 'number' && typeof this.route[0].y === 'number') {
      this.position = {
        x: this.route[0].x,
        y: this.route[0].y
      };
    } else {
      console.error('Invalid route start position for ambulance', this.id);
      this.position = { x: 300, y: 200 }; // Default fallback position
    }

    this.container = new PIXI.Container();
    this.container.x = this.position.x;
    this.container.y = this.position.y;

    this.missionPhase = 'toPatient'; // toPatient, toHospital, returning
    this.isActive = true;
    this.destroyed = false;

    this.init();
  }

  init() {
    // Ambulance body
    const body = new PIXI.Graphics();
    body.beginFill(0xFFFFFF);
    body.drawRoundedRect(-20, -10, 40, 20, 3);
    body.endFill();

    // Red cross
    body.beginFill(0xFF0000);
    body.drawRect(-2, -8, 4, 16); // Vertical
    body.drawRect(-8, -2, 16, 4); // Horizontal
    body.endFill();

    this.container.addChild(body);

    // Emergency lights (flashing)
    this.leftLight = new PIXI.Graphics();
    this.leftLight.beginFill(0xFF0000);
    this.leftLight.drawCircle(-12, -5, 3);
    this.leftLight.endFill();
    this.container.addChild(this.leftLight);

    this.rightLight = new PIXI.Graphics();
    this.rightLight.beginFill(0x0000FF);
    this.rightLight.drawCircle(12, -5, 3);
    this.rightLight.endFill();
    this.container.addChild(this.rightLight);

    // Siren glow effect
    this.sirenGlow = new PIXI.Graphics();
    this.sirenGlow.alpha = 0;
    this.container.addChild(this.sirenGlow);

    // Shadow
    this.shadow = new PIXI.Graphics();
    this.shadow.beginFill(0x000000, 0.3);
    this.shadow.drawEllipse(0, 15, 25, 8);
    this.shadow.endFill();
    this.container.addChild(this.shadow);

    // Label
    this.label = new PIXI.Text(this.name, {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: this.color,
      fontWeight: 'bold'
    });
    this.label.anchor.set(0.5);
    this.label.y = -25;
    this.container.addChild(this.label);
  }

  update = (delta) => {
    // Wrap entire update in try-catch to prevent any crash from propagating
    try {
      // Safety check for this context and destroyed state
      if (!this || this.destroyed) return;

      // Ensure position exists - reinitialize from container if null
      if (!this.position || typeof this.position.x !== 'number' || typeof this.position.y !== 'number') {
        if (this.container && typeof this.container.x === 'number' && typeof this.container.y === 'number') {
          // Update properties, don't reassign object if possible, but here we need to ensure it exists
          if (!this.position) this.position = {};
          this.position.x = this.container.x;
          this.position.y = this.container.y;
        } else if (this.route && this.route[0]) {
          if (!this.position) this.position = {};
          this.position.x = this.route[0].x;
          this.position.y = this.route[0].y;
        } else {
          // Cannot recover position, abort update
          return;
        }
      }

      if (!this.isActive || !this.route || this.currentWaypointIndex >= this.route.length) {
        return;
      }

      // Get target waypoint
      const target = this.route[this.currentWaypointIndex];

      // Safety check for target
      if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
        return;
      }

      // CRITICAL: Cache position values locally to prevent race condition
      // If this.position becomes null mid-update, we still have the cached values
      const currentX = this.position.x;
      const currentY = this.position.y;

      // Verify cached values are valid
      if (typeof currentX !== 'number' || typeof currentY !== 'number') {
        return;
      }

      // Move towards target using cached position
      const result = moveTowards(
        currentX,
        currentY,
        target.x,
        target.y,
        this.baseSpeed
      );

      // Update position properties - check if position object still exists
      if (this.position && typeof this.position === 'object') {
        this.position.x = result.x;
        this.position.y = result.y;
      } else {
        // If position object was destroyed, recreate it
        this.position = { x: result.x, y: result.y };
      }

      // Update container position - with null check
      if (this.container && this.position) {
        try {
          this.container.x = this.position.x;
          this.container.y = this.position.y;

          // Rotate ambulance to face direction
          const angle = angleBetween(this.position.x, this.position.y, target.x, target.y);
          this.container.rotation = angle;
        } catch (error) {
          console.warn('Error updating container:', error);
        }
      }

      // Check if reached waypoint
      if (result.reached) {
        this.currentWaypointIndex++;

        // Check mission phase transitions
        if (this.currentWaypointIndex >= this.route.length) {
          this.isActive = false;
        }
      }

      // Animate emergency lights - with error handling
      try {
        this.animateLights();
      } catch (error) {
        console.warn('Error animating lights:', error);
      }
    } catch (error) {
      console.error('Critical error in ambulance update:', error);
      // Mark as destroyed to prevent further updates
      this.destroyed = true;
    }
  }

  animateLights() {
    // Safety checks
    if (!this.leftLight || !this.rightLight || !this.sirenGlow) {
      return;
    }

    const time = Date.now();
    const flash = Math.sin(time / 100) > 0;

    this.leftLight.alpha = flash ? 1 : 0.3;
    this.rightLight.alpha = !flash ? 1 : 0.3;

    // Pulsing siren glow
    this.sirenGlow.clear();
    const glowAlpha = (Math.sin(time / 200) + 1) / 2 * 0.3;
    this.sirenGlow.beginFill(0xFF0000, glowAlpha);
    this.sirenGlow.drawCircle(0, 0, 40);
    this.sirenGlow.endFill();
  }

  getPosition() {
    // Return a safe copy to prevent external modifications
    if (!this.position || typeof this.position.x !== 'number' || typeof this.position.y !== 'number') {
      return { x: 0, y: 0 };
    }
    return { x: this.position.x, y: this.position.y };
  }

  getCurrentIntersection() {
    if (!this.route || this.currentWaypointIndex >= this.route.length) {
      return null;
    }
    const waypoint = this.route[this.currentWaypointIndex];
    return waypoint ? waypoint.intersectionId : null;
  }

  getNextIntersection() {
    if (!this.route || this.currentWaypointIndex + 1 >= this.route.length) {
      return null;
    }
    const waypoint = this.route[this.currentWaypointIndex + 1];
    return waypoint ? waypoint.intersectionId : null;
  }

  isNearIntersection(intersectionId, threshold = 100) {
    try {
      // Comprehensive null checks
      if (!this.position || typeof this.position.x !== 'number' || typeof this.position.y !== 'number') {
        return false;
      }

      if (!this.route) {
        return false;
      }

      const intersection = this.route.find(p => p && p.intersectionId === intersectionId);
      if (!intersection || typeof intersection.x !== 'number' || typeof intersection.y !== 'number') {
        return false;
      }

      return distance(this.position.x, this.position.y, intersection.x, intersection.y) <= threshold;
    } catch (error) {
      console.warn('Error in isNearIntersection:', error);
      return false;
    }
  }

  getContainer() {
    return this.container;
  }

  setMissionPhase(phase) {
    this.missionPhase = phase;
  }

  destroy() {
    this.destroyed = true;
    if (this.container) {
      this.container.destroy({ children: true });
    }
  }
}

export default Ambulance;
