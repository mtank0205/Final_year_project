// Hospital Discovery Service - Finds hospitals dynamically from OpenStreetMap
const axios = require('axios');

class HospitalDiscovery {
  constructor() {
    this.discoveredHospitals = new Map(); // Cache discovered hospitals
    this.OVERPASS_API = 'https://overpass-api.de/api/interpreter';
  }

  // Discover hospitals near a location using OpenStreetMap Overpass API
  async discoverNearbyHospitals(lat, lng, radiusMeters = 5000) {
    try {
      // Overpass QL query to find hospitals within radius
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
          way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
          node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
          way["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
        );
        out center;
      `;

      const response = await axios.post(this.OVERPASS_API, `data=${encodeURIComponent(query)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      });

      const elements = response.data.elements || [];
      const hospitals = [];

      // Helper: decide if an OSM element likely represents a multispeciality/general hospital
      const excludedSpecialities = [
        'clinic','eye','ophthalmology','optical','dental','dentist','physio','physiotherapy',
        'wellness','ayurveda','homeopathy','optician','ophthalmic','dialysis','maternity','psychiatric','psychiatry'
      ];

      function isMultispeciality(tags, name) {
        if (!tags) return true; // no tags - assume general hospital
        if ((tags.amenity || '').toLowerCase() !== 'hospital') return false;

        const speciality = (tags.speciality || tags['healthcare:speciality'] || tags['hospital:speciality'] || '').toLowerCase();
        if (!speciality) {
          // No explicit speciality -> likely a general hospital
          return true;
        }

        for (const ex of excludedSpecialities) {
          if (speciality.includes(ex)) return false;
        }

        // Name heuristics: if name explicitly says clinic/eye/dental, exclude
        const n = (name || '').toLowerCase();
        for (const ex of excludedSpecialities) {
          if (n.includes(ex)) return false;
        }

        return true;
      }

      elements.forEach((element, index) => {
        const hospitalLat = element.lat || (element.center && element.center.lat);
        const hospitalLng = element.lon || (element.center && element.center.lon);

        if (hospitalLat && hospitalLng) {
          const name = element.tags?.name || `Unnamed Hospital ${index + 1}`;
          const id = `OSM_${element.id}`;

          // Only consider multispeciality/general hospitals: filter out small clinics, eye/dental, wellness centers
          if (!isMultispeciality(element.tags, name)) return;

          const hospital = {
            id: id,
            name: name,
            type: 'hospital',
            lat: hospitalLat,
            lng: hospitalLng,
            source: 'OpenStreetMap',
            discovered: new Date().toISOString()
          };

          if (!this.discoveredHospitals.has(id)) {
            this.discoveredHospitals.set(id, hospital);
            hospitals.push(hospital);
          }
        }
      });

      console.log(`🔍 Discovered ${hospitals.length} new hospitals near (${lat}, ${lng})`);
      return hospitals;
    } catch (error) {
      console.error('Failed to discover hospitals from OSM:', error.message);
      return [];
    }
  }

  // Get all discovered hospitals (from cache)
  getAllDiscoveredHospitals() {
    return Array.from(this.discoveredHospitals.values());
  }

  // Merge static hospitals with discovered ones
  mergeHospitals(staticHospitals) {
    // Only include static hospitals that are explicitly marked as major/multispeciality
    const majors = staticHospitals.filter(h => h.type === 'major');

    const allHospitals = [...majors];
    this.discoveredHospitals.forEach(hospital => {
      const isDuplicate = majors.some(h => 
        Math.abs(h.lat - hospital.lat) < 0.001 && 
        Math.abs(h.lng - hospital.lng) < 0.001
      );
      if (!isDuplicate) allHospitals.push(hospital);
    });

    return allHospitals;
  }

  // Save discovered hospitals to JSON file (optional)
  async saveToFile(filePath) {
    const fs = require('fs').promises;
    const hospitals = this.getAllDiscoveredHospitals();
    
    try {
      await fs.writeFile(
        filePath, 
        JSON.stringify(hospitals, null, 2), 
        'utf8'
      );
      console.log(`✓ Saved ${hospitals.length} discovered hospitals to ${filePath}`);
    } catch (error) {
      console.error('Failed to save hospitals:', error.message);
    }
  }

  // Load previously discovered hospitals from file
  async loadFromFile(filePath) {
    const fs = require('fs').promises;
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const hospitals = JSON.parse(data);
      
      hospitals.forEach(h => {
        this.discoveredHospitals.set(h.id, h);
      });
      
      console.log(`✓ Loaded ${hospitals.length} discovered hospitals from cache`);
    } catch (error) {
      // File doesn't exist yet, that's okay
      console.log('No cached hospitals found, will discover fresh');
    }
  }
}

module.exports = { HospitalDiscovery };
