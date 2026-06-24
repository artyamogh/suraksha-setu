// Emergency Numbers DB
    const emergencyNumbers = {
        'IN': {
            name: 'India', numbers: [
                { label: 'Police', number: '100' },
                { label: 'Fire', number: '101' },
                { label: 'Ambulance', number: '102' },
                { label: 'General Emergency', number: '112' }
            ]
        },
        'US': {
            name: 'USA', numbers: [
                { label: 'Emergency (All Services)', number: '911' }
            ]
        },
        'GB': {
            name: 'UK', numbers: [
                { label: 'Emergency (All Services)', number: '999' },
                { label: 'Medical (Non-Emergency)', number: '111' }
            ]
        },
        'EU': {
            name: 'Europe', numbers: [
                { label: 'Emergency (All Services)', number: '112' }
            ]
        },
        'default': {
            name: 'Global', numbers: [
                { label: 'Universal Emergency', number: '112' },
                { label: 'Police', number: '100' }
            ]
        }
    };

    // SOS Logic
    function triggerSOS() {
        // Show Modal
        const sosModal = new bootstrap.Modal(document.getElementById('sosModal'));
        sosModal.show();

        // Reset State
        document.getElementById('sos-spinner').style.display = 'block';
        document.getElementById('sos-content').style.display = 'none';

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    // 1. Reverse Geocode to get Country Code
                    let countryCode = 'IN'; // Default to India
                    let locationText = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                        const data = await res.json();
                        locationText = data.display_name || locationText;
                        if (data.address && data.address.country_code) {
                            countryCode = data.address.country_code.toUpperCase();
                        }
                    } catch (e) { console.error("Geocoding failed", e); }

                    // 2. Log to Server (Simulated for now, can be connected to /api/sos)
                    console.log("SOS Sent to Server", { lat, lng, countryCode });

                    // 3. Update UI
                    updateSOSUI(countryCode, locationText);
                },
                (err) => {
                    // Fallback if denied
                    updateSOSUI('IN', 'Location Permission Denied. Defaulting to India.');
                }
            );
        } else {
            updateSOSUI('IN', 'Geolocation not available.');
        }
    }

    function updateSOSUI(countryCode, locationText) {
        document.getElementById('sos-spinner').style.display = 'none';
        document.getElementById('sos-content').style.display = 'block';
        document.getElementById('sos-location-text').innerText = locationText;

        // Get numbers
        const data = emergencyNumbers[countryCode] || emergencyNumbers['default'];
        document.getElementById('sos-country').innerText = data.name;

        const listContainer = document.getElementById('sos-numbers-list');
        listContainer.innerHTML = '';

        data.numbers.forEach(item => {
            const btn = document.createElement('a');
            btn.href = `tel:${item.number}`;
            btn.className = 'btn btn-outline-danger btn-lg text-start d-flex justify-content-between align-items-center mb-2';
            btn.innerHTML = `
                <span><i class="fas fa-phone-alt me-2"></i> ${item.label}</span>
                <span class="fw-bold">${item.number}</span>
            `;
            listContainer.appendChild(btn);
        });
    }

    // --- Live Dashboard Logic ---
    document.addEventListener('DOMContentLoaded', () => {
        initMap();
    });

    let map, userMarker, userLatLng;

    function initMap() {
        // Base Layers
        const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        });

        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri',
            maxZoom: 19
        });

        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        });

        // Initialize Map
        map = L.map('global-map', {
            center: [20, 0],
            zoom: 2,
            layers: [carto], // Default layer
            zoomControl: false // Custom placement via code below or separate control
        });

        // Layer Control
        const baseMaps = {
            "Clean Map": carto,
            "Satellite": satellite,
            "Street Map": osm
        };
        L.control.layers(baseMaps).addTo(map);

        // Zoom Control (Top Right)
        L.control.zoom({
            position: 'topright'
        }).addTo(map);

        // Custom Controls Container (Top Left) (Compass, Recenter)
        const CustomControl = L.Control.extend({
            onAdd: function (map) {
                const container = L.DomUtil.create('div', 'leaflet-bar');

                // Recenter Button
                const recenterBtn = L.DomUtil.create('a', 'custom-map-control', container);
                recenterBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
                recenterBtn.title = "Locate Me";
                recenterBtn.href = "#";
                recenterBtn.onclick = (e) => {
                    e.preventDefault();
                    if (userLatLng) {
                        map.flyTo(userLatLng, 8);
                    } else {
                        alert("Location not yet acquired. Please wait.");
                    }
                };

                // Compass / Reset View Button
                const compassBtn = L.DomUtil.create('a', 'custom-map-control', container);
                compassBtn.innerHTML = '<i class="far fa-compass"></i>';
                compassBtn.title = "Reset View";
                compassBtn.href = "#";
                compassBtn.onclick = (e) => {
                    e.preventDefault();
                    map.setView([20, 0], 2); // Reset to global view
                };

                return container;
            },
            onRemove: function (map) {
                // Nothing to do here
            }
        });

        map.addControl(new CustomControl({ position: 'topleft' }));


        // 1. Get User Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    userLatLng = [lat, lng]; // Store for recenter

                    document.getElementById('user-location-status').innerHTML = '<span class="status-dot"></span> <span>Location Acquired</span>';

                    // Fly to user
                    map.flyTo([lat, lng], 6);

                    // Add user marker
                    userMarker = L.marker([lat, lng]).addTo(map)
                        .bindPopup("<b>You are here</b>").openPopup();

                    // Fetch threats near user
                    fetchLiveEarthquakes(lat, lng);
                },
                (error) => {
                    console.error("Location error:", error);
                    document.getElementById('user-location-status').innerHTML = '<span class="status-dot" style="background-color: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);"></span> <span>Location Denied</span>';
                    fetchLiveEarthquakes(null, null); // Load global data anyway
                }
            );
        } else {
            fetchLiveEarthquakes(null, null);
        }
    }

    async function fetchLiveEarthquakes(userLat, userLng) {
        const threatList = document.getElementById('threat-list');
        try {
            // USGS API: All 4.5+ earthquakes in past 7 days (more data than 'significant' to show relative proximity)
            const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson');
            const data = await response.json();

            threatList.innerHTML = ''; // Clear loading state

            let threats = [];

            data.features.forEach(quake => {
                const coords = quake.geometry.coordinates; // lng, lat, depth
                const props = quake.properties;
                const magnitude = props.mag;
                const title = props.title;
                const url = props.url;
                const quakeLat = coords[1];
                const quakeLng = coords[0];

                // Calculate Distance if user location is known
                let distance = null;
                if (userLat && userLng) {
                    distance = getDistanceFromLatLonInKm(userLat, userLng, quakeLat, quakeLng);
                }

                threats.push({
                    lat: quakeLat,
                    lng: quakeLng,
                    magnitude,
                    title,
                    place: props.place,
                    time: props.time,
                    url,
                    distance // can be null
                });
            });

            // Sort by distance (nearest first) or magnitude if location unknown
            if (userLat && userLng) {
                threats.sort((a, b) => a.distance - b.distance);
            } else {
                threats.sort((a, b) => b.magnitude - a.magnitude);
            }

            // Render Top 20 Threats
            threats.slice(0, 20).forEach((quake, index) => {
                // Add Map Marker
                const circle = L.circleMarker([quake.lat, quake.lng], {
                    radius: quake.magnitude * 2.5,
                    fillColor: getSeverityColor(quake.magnitude),
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.7
                }).addTo(map);

                const distText = quake.distance ? `<br>Distance: ${Math.round(quake.distance)} km` : '';
                circle.bindPopup(`<b>${quake.title}</b><br>Magnitude: ${quake.magnitude}${distText}<br><a href="${quake.url}" target="_blank">Details</a>`);

                // Add to Sidebar
                const dateObj = new Date(quake.time);
                const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const dateStr = dateObj.toLocaleDateString();
                const item = document.createElement('div');
                item.className = 'threat-item';
                item.style.borderLeft = `4px solid ${getSeverityColor(quake.magnitude)}`;
                // Stagger animation
                item.style.animationDelay = `${index * 0.05}s`;

                const distBadge = quake.distance
                    ? `<span style="background:#f1f5f9; color:#475569; padding:0.25rem 0.5rem; border-radius:6px; font-size:0.75rem; font-weight:600;">${Math.round(quake.distance)} km away</span>`
                    : '';

                item.innerHTML = `
                    <div style="font-weight: 600; font-size: 0.95rem; color: #0f172a; margin-bottom: 0.5rem;">${quake.place}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-weight: 700; font-size: 0.9rem; color: ${getSeverityColor(quake.magnitude)}">Mag ${quake.magnitude}</span>
                        ${distBadge}
                    </div>
                    <div style="font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 0.3rem;">
                        <i class="far fa-clock"></i> ${dateStr}, ${timeStr}
                    </div>
                `;
                item.onclick = () => {
                    map.flyTo([quake.lat, quake.lng], 8);
                    circle.openPopup();
                };
                threatList.appendChild(item);
            });

            if (threats.length === 0) {
                threatList.innerHTML = '<div style="padding:1rem;">No major earthquakes reported recently.</div>';
            }

        } catch (error) {
            console.error("API Error", error);
            threatList.innerHTML = '<div style="color: var(--danger); padding: 1rem;">Failed to load live data.</div>';
        }
    }

    // Helper: Haversine Formula
    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1);  // deg2rad below
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180)
    }

    function getSeverityColor(mag) {
        if (mag >= 7.0) return '#ef4444'; // Red
        if (mag >= 6.0) return '#f59e0b'; // Orange
        return '#10b981'; // Green/Teal
    }