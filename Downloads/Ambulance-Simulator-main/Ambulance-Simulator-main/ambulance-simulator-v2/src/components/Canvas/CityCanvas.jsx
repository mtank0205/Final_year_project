// Main city canvas using PixiJS
import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, intersections } from '../../data/cityMap';
import { ambulances as ambulanceData, patients, hospitals } from '../../data/mockData';
import { calculateMissionRoute } from '../../utils/pathfinding';
import { Road } from '../Infrastructure/Road';
import { TrafficLight } from '../Infrastructure/TrafficLight';
import { Ambulance } from '../Vehicles/Ambulance';
import './CityCanvas.css';

const CityCanvas = ({ onAmbulanceClick }) => {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const ambulancesRef = useRef([]);
  const trafficLightsRef = useRef([]);

  useEffect(() => {
    console.log('CityCanvas useEffect starting...');
    
    // Create PixiJS application
    const app = new PIXI.Application({
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 0x1a1a1a,
      antialias: true,
    });

    console.log('PixiJS Application created', app);

    if (!canvasRef.current) {
      console.error('Canvas ref is null!');
      return;
    }
    
    canvasRef.current.appendChild(app.view);
    appRef.current = app;
    
    console.log('Canvas added to DOM');

    // Create containers for layering
    const roadLayer = new PIXI.Container();
    const trafficLightLayer = new PIXI.Container();
    const vehicleLayer = new PIXI.Container();
    const markerLayer = new PIXI.Container();

    app.stage.addChild(roadLayer);
    app.stage.addChild(trafficLightLayer);
    app.stage.addChild(vehicleLayer);
    app.stage.addChild(markerLayer);

    // Draw roads
    console.log('Drawing roads...');
    const road = new Road(app);
    roadLayer.addChild(road.getContainer());
    console.log('Roads drawn successfully');

    // Create traffic lights at intersections
    intersections.forEach((intersection) => {
      if (!intersection || !intersection.id) {
        console.error('Invalid intersection:', intersection);
        return;
      }
      const trafficLight = new TrafficLight(app, intersection, intersection.id);
      trafficLightLayer.addChild(trafficLight.getContainer());
      trafficLightsRef.current.push(trafficLight);
    });

    // Draw hospitals
    hospitals.forEach((hospital) => {
      const hospitalIntersection = intersections.find(i => i.id === hospital.intersectionId);
      if (!hospitalIntersection) {
        console.error('Hospital intersection not found:', hospital.intersectionId);
        return;
      }
      const marker = createHospitalMarker(hospitalIntersection, hospital);
      markerLayer.addChild(marker);
    });

    // Draw patients
    patients.forEach((patient) => {
      const patientIntersection = intersections.find(i => i.id === patient.intersectionId);
      if (!patientIntersection) {
        console.error('Patient intersection not found:', patient.intersectionId);
        return;
      }
      const marker = createPatientMarker(patientIntersection, patient, app);
      markerLayer.addChild(marker);
    });

    // Create ambulances with routes
    ambulanceData.forEach((ambulanceConfig) => {
      const patient = patients.find(p => p.id === ambulanceConfig.patientId);
      const hospital = hospitals.find(h => h.id === ambulanceConfig.hospitalId);
      
      if (!patient || !hospital) {
        console.error('Patient or hospital not found for ambulance', ambulanceConfig.id);
        return;
      }
      
      const mission = calculateMissionRoute(
        ambulanceConfig.startIntersectionId,
        patient.intersectionId,
        hospital.intersectionId
      );

      const fullRoute = mission.fullPath
        .map(id => {
          const intersection = intersections.find(i => i.id === id);
          if (!intersection) {
            console.error('Intersection not found:', id);
            return null;
          }
          return { x: intersection.x, y: intersection.y, intersectionId: id };
        })
        .filter(point => point !== null);

      if (fullRoute.length === 0) {
        console.error('No valid route found for ambulance', ambulanceConfig.id);
        return;
      }

      const ambulance = new Ambulance(app, ambulanceConfig, fullRoute);
      
      // Verify ambulance was created properly
      if (!ambulance || !ambulance.position) {
        console.error('Failed to create ambulance properly', ambulanceConfig.id);
        return;
      }
      
      console.log('Ambulance created:', ambulance.id, 'at position:', ambulance.position);
      
      vehicleLayer.addChild(ambulance.getContainer());
      ambulancesRef.current.push(ambulance);

      // Make ambulance clickable
      ambulance.getContainer().interactive = true;
      ambulance.getContainer().buttonMode = true;
      ambulance.getContainer().on('pointerdown', () => {
        if (onAmbulanceClick) {
          onAmbulanceClick(ambulance.id);
        }
      });
    });

    // Animation loop
    app.ticker.add((delta) => {
      // Skip updates if component is destroyed
      if (isDestroyedRef.current) return;
      
      // Update ambulances with safety checks
      if (ambulancesRef.current && ambulancesRef.current.length > 0) {
        ambulancesRef.current.forEach((ambulance) => {
          if (ambulance && typeof ambulance.update === 'function') {
            try {
              ambulance.update(delta);
            } catch (error) {
              console.error('Error updating ambulance:', error);
            }
          }
        });
      }
      
      // Check proximity to traffic lights
      if (ambulancesRef.current && trafficLightsRef.current) {
        ambulancesRef.current.forEach((ambulance) => {
          if (!ambulance || !ambulance.position || typeof ambulance.isNearIntersection !== 'function') return;
          
          trafficLightsRef.current.forEach((light) => {
            if (!light || typeof light.getIntersectionId !== 'function') return;
            
            try {
              const isNear = ambulance.isNearIntersection(light.getIntersectionId(), 150);
              
              if (isNear && light.getState() === 'red') {
                // Start countdown to turn green
                light.setState('yellow');
                light.setCountdown(3);
                
                setTimeout(() => {
                  if (light) {
                    light.setState('green');
                    light.setCountdown(0);
                  }
                }, 3000);
              } else if (!isNear && light.getState() === 'green') {
                // Return to red after delay
                setTimeout(() => {
                  if (light) {
                    light.setState('red');
                    light.setCountdown(0);
                  }
                }, 5000);
              }
            } catch (error) {
              console.error('Error checking traffic signal proximity:', error);
            }
          });
        });
      }

      // Update traffic lights
      if (trafficLightsRef.current && trafficLightsRef.current.length > 0) {
        trafficLightsRef.current.forEach((light) => {
          if (light && typeof light.update === 'function') {
            try {
              light.update(delta);
            } catch (error) {
              console.error('Error updating traffic light:', error);
            }
          }
        });
      }
    });

    // Cleanup
    return () => {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, [onAmbulanceClick]);

  return <div ref={canvasRef} className="city-canvas" />;
};

// Helper to create hospital marker
const createHospitalMarker = (intersection, hospital) => {
  const container = new PIXI.Container();
  container.x = intersection.x;
  container.y = intersection.y;

  // Hospital building
  const building = new PIXI.Graphics();
  building.beginFill(0xFFFFFF);
  building.drawRect(-25, -40, 50, 40);
  building.endFill();

  // Red cross
  building.beginFill(0xFF0000);
  building.drawRect(-3, -30, 6, 20); // Vertical
  building.drawRect(-10, -23, 20, 6); // Horizontal
  building.endFill();

  container.addChild(building);

  // Label
  const label = new PIXI.Text('🏥 Hospital', {
    fontFamily: 'Arial',
    fontSize: 12,
    fill: 0xFF4444,
    fontWeight: 'bold'
  });
  label.anchor.set(0.5);
  label.y = -50;
  container.addChild(label);

  return container;
};

// Helper to create patient marker
const createPatientMarker = (intersection, patient, app) => {
  const container = new PIXI.Container();
  container.x = intersection.x;
  container.y = intersection.y;

  // Patient marker circle
  const circle = new PIXI.Graphics();
  const color = patient.urgency === 'Critical' ? 0xFF0000 : 0xFFA500;
  circle.beginFill(color);
  circle.drawCircle(0, 0, 15);
  circle.endFill();

  // Patient icon
  circle.beginFill(0xFFFFFF);
  circle.drawCircle(0, -5, 5); // Head
  circle.drawRect(-3, 0, 6, 10); // Body
  circle.endFill();

  container.addChild(circle);

  // Label
  const label = new PIXI.Text('📍 Patient', {
    fontFamily: 'Arial',
    fontSize: 12,
    fill: color,
    fontWeight: 'bold'
  });
  label.anchor.set(0.5);
  label.y = 25;
  container.addChild(label);

  // Pulsing animation
  if (app && app.ticker) {
    app.ticker.add(() => {
      const pulse = Math.sin(Date.now() / 500) * 0.2 + 1;
      container.scale.set(pulse);
    });
  }

  return container;
};

export default CityCanvas;
