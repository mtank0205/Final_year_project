// Road rendering class for PixiJS
import * as PIXI from 'pixi.js';
import { getRoadSegments, LANE_WIDTH } from '../../data/cityMap';

export class Road {
  constructor(app) {
    this.app = app;
    this.container = new PIXI.Container();
    this.roadSegments = getRoadSegments();
    this.init();
  }

  init() {
    // Draw all road segments
    this.roadSegments.forEach(segment => {
      this.drawRoad(segment);
    });
  }

  drawRoad(segment) {
    const { x1, y1, x2, y2, isHorizontal, lanes } = segment;
    const roadWidth = lanes * LANE_WIDTH;
    
    // Main road background (dark gray)
    const road = new PIXI.Graphics();
    road.beginFill(0x404040);
    
    if (isHorizontal) {
      road.drawRect(x1, y1 - roadWidth / 2, x2 - x1, roadWidth);
    } else {
      road.drawRect(x1 - roadWidth / 2, y1, roadWidth, y2 - y1);
    }
    
    road.endFill();
    this.container.addChild(road);
    
    // Draw lane markings
    this.drawLaneMarkings(segment, roadWidth);
    
    // Draw road borders
    this.drawRoadBorders(segment, roadWidth);
  }

  drawLaneMarkings(segment, roadWidth) {
    const { x1, y1, x2, y2, isHorizontal, lanes } = segment;
    const markings = new PIXI.Graphics();
    markings.lineStyle(2, 0xFFFFFF, 0.5);
    
    // Draw dashed center line and lane dividers
    for (let i = 1; i < lanes; i++) {
      const offset = (roadWidth / lanes) * i - roadWidth / 2;
      
      if (isHorizontal) {
        this.drawDashedLine(markings, x1, y1 + offset, x2, y1 + offset);
      } else {
        this.drawDashedLine(markings, x1 + offset, y1, x1 + offset, y2);
      }
    }
    
    this.container.addChild(markings);
  }

  drawRoadBorders(segment, roadWidth) {
    const { x1, y1, x2, y2, isHorizontal } = segment;
    const border = new PIXI.Graphics();
    border.lineStyle(3, 0xFFFFFF, 1);
    
    if (isHorizontal) {
      // Top border
      border.moveTo(x1, y1 - roadWidth / 2);
      border.lineTo(x2, y1 - roadWidth / 2);
      // Bottom border
      border.moveTo(x1, y1 + roadWidth / 2);
      border.lineTo(x2, y1 + roadWidth / 2);
    } else {
      // Left border
      border.moveTo(x1 - roadWidth / 2, y1);
      border.lineTo(x1 - roadWidth / 2, y2);
      // Right border
      border.moveTo(x1 + roadWidth / 2, y1);
      border.lineTo(x1 + roadWidth / 2, y2);
    }
    
    this.container.addChild(border);
  }

  drawDashedLine(graphics, x1, y1, x2, y2) {
    const dashLength = 15;
    const gapLength = 10;
    const totalLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    let currentLength = 0;
    let isDash = true;
    
    while (currentLength < totalLength) {
      const segmentLength = isDash ? dashLength : gapLength;
      const endLength = Math.min(currentLength + segmentLength, totalLength);
      
      if (isDash) {
        const startX = x1 + currentLength * Math.cos(angle);
        const startY = y1 + currentLength * Math.sin(angle);
        const endX = x1 + endLength * Math.cos(angle);
        const endY = y1 + endLength * Math.sin(angle);
        
        graphics.moveTo(startX, startY);
        graphics.lineTo(endX, endY);
      }
      
      currentLength = endLength;
      isDash = !isDash;
    }
  }

  getContainer() {
    return this.container;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}

export default Road;
